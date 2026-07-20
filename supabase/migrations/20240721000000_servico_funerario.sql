-- Enum for Service Status
create type public.servico_status as enum ('Em Atendimento', 'Preparação', 'Velório', 'Sepultamento', 'Finalizado', 'Cancelado');

-- Enum for Payment Types
create type public.servico_tipo as enum ('Plano', 'Particular', 'Convênio', 'Prefeitura');

-- Services Table
create table public.servicos_funerarios (
    id uuid primary key default gen_random_uuid(),
    numero_servico serial,
    data_abertura timestamp with time zone default now(),
    data_obito date,
    hora_obito time,
    tipo servico_tipo not null,
    status servico_status default 'Em Atendimento',
    
    -- Falecido
    falecido_nome text not null,
    falecido_cpf text,
    falecido_rg text,
    falecido_sexo text,
    falecido_estado_civil text,
    falecido_data_nascimento date,
    falecido_naturalidade text,
    falecido_nacionalidade text,
    falecido_profissao text,
    falecido_nome_pai text,
    falecido_nome_mae text,
    falecido_endereco text,
    
    -- Informações do Óbito
    local_obito text,
    cidade_obito text,
    hospital_obito text,
    medico_responsavel text,
    causa_morte text,
    numero_do text,
    cartorio text,
    
    -- Responsável
    responsavel_nome text,
    responsavel_cpf text,
    responsavel_rg text,
    responsavel_telefone text,
    responsavel_whatsapp text,
    responsavel_parentesco text,
    responsavel_endereco text,
    responsavel_email text,
    
    -- Plano (optional link)
    associado_id uuid references public.associados(id),
    
    -- Equipe e Veículo
    agente_funerario text,
    motorista text,
    auxiliar text,
    tanatopraxista text,
    cerimonialista text,
    veiculo_placa text,
    km_saida numeric,
    km_retorno numeric,
    combustivel text,
    
    -- Velório e Sepultamento
    velorio_local text,
    velorio_cidade text,
    velorio_endereco text,
    velorio_capela text,
    velorio_inicio timestamp with time zone,
    velorio_termino timestamp with time zone,
    sepultamento_cemiterio text,
    sepultamento_cidade text,
    sepultamento_jazigo text,
    sepultamento_quadra text,
    sepultamento_lote text,
    sepultamento_horario timestamp with time zone,
    cremacao boolean default false,
    
    observacoes text,
    filial_id uuid references public.filiais(id),
    created_at timestamp with time zone default now()
);

-- Timeline for events
create table public.servico_timeline (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    evento text not null,
    created_at timestamp with time zone default now()
);

-- Checklist of services
create table public.servico_checklist (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    item text not null,
    concluido boolean default false
);

-- Financial records for service
create table public.servico_financeiro (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    valor_total numeric(12,2) default 0,
    desconto numeric(12,2) default 0,
    acrescimo numeric(12,2) default 0,
    valor_final numeric(12,2) default 0,
    status text default 'pendente'
);

-- Grants
grant select, insert, update, delete on public.servicos_funerarios to authenticated;
grant select, insert, update, delete on public.servico_timeline to authenticated;
grant select, insert, update, delete on public.servico_checklist to authenticated;
grant select, insert, update, delete on public.servico_financeiro to authenticated;

grant all on public.servicos_funerarios to service_role;
grant all on public.servico_timeline to service_role;
grant all on public.servico_checklist to service_role;
grant all on public.servico_financeiro to service_role;

-- RLS
alter table public.servicos_funerarios enable row level security;
alter table public.servico_timeline enable row level security;
alter table public.servico_checklist enable row level security;
alter table public.servico_financeiro enable row level security;

create policy "All authenticated can manage servicos" on public.servicos_funerarios for all to authenticated using (true);
create policy "All authenticated can manage servicos_timeline" on public.servico_timeline for all to authenticated using (true);
create policy "All authenticated can manage servicos_checklist" on public.servico_checklist for all to authenticated using (true);
create policy "All authenticated can manage servicos_financeiro" on public.servico_financeiro for all to authenticated using (true);
