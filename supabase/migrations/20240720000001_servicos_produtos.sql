CREATE TABLE IF NOT EXISTS public.servicos_produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('Serviço', 'Produto')),
    preco numeric(12,2) NOT NULL DEFAULT 0,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos_produtos TO authenticated;
GRANT ALL ON public.servicos_produtos TO service_role;

ALTER TABLE public.servicos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para autenticados" ON public.servicos_produtos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para autenticados" ON public.servicos_produtos
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para autenticados" ON public.servicos_produtos
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir exclusão para autenticados" ON public.servicos_produtos
    FOR DELETE TO authenticated USING (true);

-- Adicionar campo associado_id e dependente_id na tabela servicos_funerarios se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'servicos_funerarios' AND COLUMN_NAME = 'associado_id') THEN
        ALTER TABLE public.servicos_funerarios ADD COLUMN associado_id uuid REFERENCES public.associados(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'servicos_funerarios' AND COLUMN_NAME = 'dependente_id') THEN
        ALTER TABLE public.servicos_funerarios ADD COLUMN dependente_id uuid REFERENCES public.dependentes(id);
    END IF;
END$$;
