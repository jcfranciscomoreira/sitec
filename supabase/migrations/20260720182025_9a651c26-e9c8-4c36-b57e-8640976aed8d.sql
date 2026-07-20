ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS google_maps_browser_key text,
  ADD COLUMN IF NOT EXISTS google_maps_tracking_id text;