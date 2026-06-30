ALTER TABLE public.cobradores ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cobradores_user_id_key ON public.cobradores(user_id) WHERE user_id IS NOT NULL;

-- Backfill: link existing cobradores to users by matching profile name (case-insensitive, trimmed)
UPDATE public.cobradores c
SET user_id = p.id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'cobrador'
WHERE c.user_id IS NULL
  AND lower(btrim(c.nome)) = lower(btrim(coalesce(p.nome, '')));