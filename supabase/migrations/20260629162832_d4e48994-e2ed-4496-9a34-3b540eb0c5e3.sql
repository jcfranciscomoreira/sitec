ALTER TABLE public.vendas_pins
  ADD COLUMN IF NOT EXISTS tipo_venda text,
  ADD COLUMN IF NOT EXISTS data_retorno date;