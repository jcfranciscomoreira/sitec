import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Missing Google Maps credentials");
    }
    const url = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });
    if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
    const json = (await res.json()) as any;
    const result = json.results?.[0];
    let municipio: string | null = null;
    let uf: string | null = null;
    let endereco: string | null = result?.formatted_address ?? null;
    for (const r of json.results ?? []) {
      for (const c of r.address_components ?? []) {
        const types: string[] = c.types ?? [];
        if (!municipio && (types.includes("administrative_area_level_2") || types.includes("locality"))) {
          municipio = c.long_name;
        }
        if (!uf && types.includes("administrative_area_level_1")) {
          uf = c.short_name;
        }
      }
      if (municipio && uf) break;
    }
    return { municipio, uf, endereco };
  });
