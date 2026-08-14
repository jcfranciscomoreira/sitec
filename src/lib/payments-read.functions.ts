import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type Plan = string | null;

function planFromPrice(price: any): Plan {
  return price?.lookup_key
    ?? price?.metadata?.lovable_external_id
    ?? null;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);
const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

function toMajorUnit(amount: number | null | undefined, currency: string): number {
  const value = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return value;
  if (THREE_DECIMAL_CURRENCIES.has(c)) return value / 1000;
  return value / 100;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

type StripeDataResult =
  | { subscriptions: any[]; invoices: any[] }
  | { error: string };

async function findCustomerIds(
  stripe: ReturnType<typeof createStripeClient>,
  options: { userId: string; email?: string },
): Promise<string[]> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  const ids = new Set<string>();

  const subs = await stripe.subscriptions.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 100,
  });
  for (const sub of subs.data) {
    const customer = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;
    if (customer) ids.add(customer);
  }

  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 100,
  });
  for (const c of customers.data) ids.add(c.id);

  if (ids.size === 0 && options.email) {
    const byEmail = await stripe.customers.list({ email: options.email, limit: 100 });
    for (const c of byEmail.data) ids.add(c.id);
  }

  return [...ids];
}

export const getStripeData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { environment: StripeEnv }) => data)
  .handler(async ({ context, data }): Promise<StripeDataResult> => {
    try {
      const { userId, supabase } = context;
      const { data: { user } } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const customerIds = await findCustomerIds(stripe, {
        userId,
        email: user?.email ?? undefined,
      });

      if (customerIds.length === 0) {
        return { subscriptions: [], invoices: [] };
      }

      const [subsRes, invsRes] = await Promise.all([
        Promise.all(customerIds.map(id => stripe.subscriptions.list({ customer: id, status: 'all', limit: 100 }))),
        Promise.all(customerIds.map(id => stripe.invoices.list({ customer: id, limit: 100 })))
      ]);

      const subscriptions = subsRes.flatMap(res => res.data.map(sub => {
        const item = sub.items?.data?.[0];
        const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;
        return {
          id: sub.id,
          status: sub.status,
          plan: planFromPrice(item?.price),
          current_period_end: isoFromUnix(periodEnd),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        };
      }));

      const invoices = invsRes.flatMap(res => res.data.map(inv => {
        const line = inv.lines?.data?.[0];
        return {
          id: inv.id ?? "",
          status: inv.status ?? null,
          amount_paid: toMajorUnit(inv.amount_paid, inv.currency),
          currency: inv.currency,
          created: isoFromUnix(inv.created),
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          pdf_url: inv.invoice_pdf ?? null,
          plan: planFromPrice((line as any)?.price),
          customer_id: typeof inv.customer === 'string' ? inv.customer : (inv.customer as any)?.id,
        };
      }));

      return { subscriptions, invoices };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
