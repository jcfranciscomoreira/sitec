-- Add financial fields to servicos_funerarios
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS valor_total decimal(12,2) DEFAULT 0;
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS desconto decimal(12,2) DEFAULT 0;
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS valor_final decimal(12,2) DEFAULT 0;

-- Table for items selected in the service
CREATE TABLE IF NOT EXISTS public.servico_itens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE CASCADE,
    item_id uuid REFERENCES public.servicos_produtos(id),
    nome text NOT NULL,
    quantidade integer DEFAULT 1,
    preco_unitario decimal(12,2) NOT NULL,
    subtotal decimal(12,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servico_itens TO authenticated;
GRANT ALL ON public.servico_itens TO service_role;

ALTER TABLE public.servico_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items for their services" ON public.servico_itens
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

