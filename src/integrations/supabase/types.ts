export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      associados: {
        Row: {
          cep: string | null
          cidade: string | null
          cobrador_id: string | null
          codigo: number
          cpf: string | null
          created_at: string
          created_by: string | null
          data_adesao: string
          data_nascimento: string | null
          dia_vencimento: number
          email: string | null
          endereco: string | null
          estado: string | null
          filial_id: string | null
          forma_pagamento: string | null
          id: string
          nome: string
          observacoes: string | null
          plano_id: string | null
          rg: string | null
          status: Database["public"]["Enums"]["status_associado"]
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cobrador_id?: string | null
          codigo?: number
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_adesao?: string
          data_nascimento?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          estado?: string | null
          filial_id?: string | null
          forma_pagamento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          plano_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["status_associado"]
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cobrador_id?: string | null
          codigo?: number
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_adesao?: string
          data_nascimento?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          estado?: string | null
          filial_id?: string | null
          forma_pagamento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          plano_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["status_associado"]
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "associados_cobrador_id_fkey"
            columns: ["cobrador_id"]
            isOneToOne: false
            referencedRelation: "cobradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associados_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associados_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_config: {
        Row: {
          alerta_email: string | null
          ativo: boolean
          created_at: string
          dia_mes: number
          dia_semana: number
          hora: number
          id: number
          periodicidade: string
          retencao_dias: number
          tabelas: string[]
          ultima_execucao: string | null
          ultimo_erro: string | null
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          alerta_email?: string | null
          ativo?: boolean
          created_at?: string
          dia_mes?: number
          dia_semana?: number
          hora?: number
          id?: number
          periodicidade?: string
          retencao_dias?: number
          tabelas?: string[]
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          alerta_email?: string | null
          ativo?: boolean
          created_at?: string
          dia_mes?: number
          dia_semana?: number
          hora?: number
          id?: number
          periodicidade?: string
          retencao_dias?: number
          tabelas?: string[]
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          erro: string | null
          formato: string | null
          id: string
          origem: string
          registros: number
          status: string
          tabelas: string[]
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          erro?: string | null
          formato?: string | null
          id?: string
          origem?: string
          registros?: number
          status?: string
          tabelas?: string[]
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          erro?: string | null
          formato?: string | null
          id?: string
          origem?: string
          registros?: number
          status?: string
          tabelas?: string[]
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      baixa_sessoes: {
        Row: {
          agente: string
          created_at: string
          data_recebimento: string
          id: string
          itens: Json
          responsavel_id: string | null
          responsavel_nome: string | null
          tenant_id: string | null
          total_qtd: number
          total_valor: number
        }
        Insert: {
          agente: string
          created_at?: string
          data_recebimento: string
          id?: string
          itens?: Json
          responsavel_id?: string | null
          responsavel_nome?: string | null
          tenant_id?: string | null
          total_qtd?: number
          total_valor?: number
        }
        Update: {
          agente?: string
          created_at?: string
          data_recebimento?: string
          id?: string
          itens?: Json
          responsavel_id?: string | null
          responsavel_nome?: string | null
          tenant_id?: string | null
          total_qtd?: number
          total_valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "baixa_sessoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_movimentos: {
        Row: {
          associado_id: string | null
          caixa_id: string
          created_at: string
          created_by: string | null
          descricao: string
          forma_pagamento: string
          id: string
          mensalidade_id: string | null
          tenant_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          associado_id?: string | null
          caixa_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          forma_pagamento?: string
          id?: string
          mensalidade_id?: string | null
          tenant_id?: string | null
          tipo?: string
          valor: number
        }
        Update: {
          associado_id?: string | null
          caixa_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          forma_pagamento?: string
          id?: string
          mensalidade_id?: string | null
          tenant_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_mensalidade_id_fkey"
            columns: ["mensalidade_id"]
            isOneToOne: false
            referencedRelation: "mensalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_sessoes: {
        Row: {
          aberto_em: string
          conta_financeira_id: string | null
          created_at: string
          fechado_em: string | null
          filial_id: string | null
          id: string
          observacoes: string | null
          operador_id: string | null
          operador_nome: string
          status: string
          tenant_id: string | null
          updated_at: string
          valor_abertura: number
          valor_fechamento_informado: number | null
        }
        Insert: {
          aberto_em?: string
          conta_financeira_id?: string | null
          created_at?: string
          fechado_em?: string | null
          filial_id?: string | null
          id?: string
          observacoes?: string | null
          operador_id?: string | null
          operador_nome: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          valor_abertura?: number
          valor_fechamento_informado?: number | null
        }
        Update: {
          aberto_em?: string
          conta_financeira_id?: string | null
          created_at?: string
          fechado_em?: string | null
          filial_id?: string | null
          id?: string
          observacoes?: string | null
          operador_id?: string | null
          operador_nome?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          valor_abertura?: number
          valor_fechamento_informado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_sessoes_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_sessoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_sessoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cobradores: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobradores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          carteirinha_config: Json | null
          cnpj: string | null
          contrato_template: string | null
          created_at: string
          endereco: string | null
          google_maps_browser_key: string | null
          google_maps_tracking_id: string | null
          id: number
          logo_url: string | null
          nome_sistema: string
          subtitulo: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          carteirinha_config?: Json | null
          cnpj?: string | null
          contrato_template?: string | null
          created_at?: string
          endereco?: string | null
          google_maps_browser_key?: string | null
          google_maps_tracking_id?: string | null
          id?: number
          logo_url?: string | null
          nome_sistema?: string
          subtitulo?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          carteirinha_config?: Json | null
          cnpj?: string | null
          contrato_template?: string | null
          created_at?: string
          endereco?: string | null
          google_maps_browser_key?: string | null
          google_maps_tracking_id?: string | null
          id?: number
          logo_url?: string | null
          nome_sistema?: string
          subtitulo?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_financeiras: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          descricao: string
          filial_id: string | null
          forma_pagamento: string | null
          fornecedor_cliente: string | null
          id: string
          observacoes: string | null
          servico_id: string | null
          status: Database["public"]["Enums"]["status_conta"]
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          descricao: string
          filial_id?: string | null
          forma_pagamento?: string | null
          fornecedor_cliente?: string | null
          id?: string
          observacoes?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["status_conta"]
          tenant_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          descricao?: string
          filial_id?: string | null
          forma_pagamento?: string | null
          fornecedor_cliente?: string | null
          id?: string
          observacoes?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["status_conta"]
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_funerarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          origem: string | null
          plano_interesse: string | null
          responsavel_id: string | null
          stage: string
          telefone: string | null
          tenant_id: string | null
          updated_at: string
          valor_estimado: number | null
          vendas_pin_id: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          plano_interesse?: string | null
          responsavel_id?: string | null
          stage?: string
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
          vendas_pin_id?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          plano_interesse?: string | null
          responsavel_id?: string | null
          stage?: string
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
          vendas_pin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_plano_interesse_fkey"
            columns: ["plano_interesse"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_vendas_pin_id_fkey"
            columns: ["vendas_pin_id"]
            isOneToOne: false
            referencedRelation: "vendas_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          key: string
          label: string
          ordem: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          key: string
          label: string
          ordem?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          ordem?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dependentes: {
        Row: {
          associado_id: string
          cpf: string | null
          created_at: string
          data_falecimento: string | null
          data_nascimento: string | null
          id: string
          nome: string
          observacoes: string | null
          parentesco: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          associado_id: string
          cpf?: string | null
          created_at?: string
          data_falecimento?: string | null
          data_nascimento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          parentesco: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          associado_id?: string
          cpf?: string | null
          created_at?: string
          data_falecimento?: string | null
          data_nascimento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          parentesco?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_itens: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          estoque_minimo: number
          filial_id: string | null
          id: string
          nome: string
          observacoes: string | null
          produto_id: string | null
          quantidade: number
          tenant_id: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          estoque_minimo?: number
          filial_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          tenant_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          estoque_minimo?: number
          filial_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          tenant_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_itens_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "servicos_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          observacao: string | null
          quantidade: number
          servico_id: string | null
          tenant_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          observacao?: string | null
          quantidade: number
          servico_id?: string | null
          tenant_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          observacao?: string | null
          quantidade?: number
          servico_id?: string | null
          tenant_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_funerarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          ativo: boolean
          cidade: string | null
          codigo: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          responsavel: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filiais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_bancaria: {
        Row: {
          ambiente: string
          ativo: boolean
          config_json: Json
          created_at: string
          id: string
          provedor: string
          secret_ref: string | null
          secrets_encrypted: string | null
          tenant_id: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          config_json?: Json
          created_at?: string
          id?: string
          provedor: string
          secret_ref?: string | null
          secrets_encrypted?: string | null
          tenant_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          config_json?: Json
          created_at?: string
          id?: string
          provedor?: string
          secret_ref?: string | null
          secrets_encrypted?: string | null
          tenant_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracao_bancaria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          descricao: string | null
          id: string
          registro_id: string | null
          tabela: string
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          descricao?: string | null
          id?: string
          registro_id?: string | null
          tabela: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          descricao?: string | null
          id?: string
          registro_id?: string | null
          tabela?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          agente_recebimento: string | null
          associado_id: string
          bonificacao_motivo: string | null
          bonificada: boolean
          bonificado_em: string | null
          bonificado_por: string | null
          bonificado_por_nome: string | null
          cobranca_id: string | null
          cobranca_provedor: string | null
          cobranca_status: string | null
          codigo: number
          codigo_barras: string | null
          competencia: string
          created_at: string
          data_pagamento: string | null
          forma_pagamento: string | null
          id: string
          linha_digitavel: string | null
          link_boleto: string | null
          observacoes: string | null
          pix_copia_cola: string | null
          qr_code_base64: string | null
          reagendamento_data: string | null
          status: Database["public"]["Enums"]["status_mensalidade"]
          tenant_id: string | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          agente_recebimento?: string | null
          associado_id: string
          bonificacao_motivo?: string | null
          bonificada?: boolean
          bonificado_em?: string | null
          bonificado_por?: string | null
          bonificado_por_nome?: string | null
          cobranca_id?: string | null
          cobranca_provedor?: string | null
          cobranca_status?: string | null
          codigo?: number
          codigo_barras?: string | null
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          linha_digitavel?: string | null
          link_boleto?: string | null
          observacoes?: string | null
          pix_copia_cola?: string | null
          qr_code_base64?: string | null
          reagendamento_data?: string | null
          status?: Database["public"]["Enums"]["status_mensalidade"]
          tenant_id?: string | null
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          agente_recebimento?: string | null
          associado_id?: string
          bonificacao_motivo?: string | null
          bonificada?: boolean
          bonificado_em?: string | null
          bonificado_por?: string | null
          bonificado_por_nome?: string | null
          cobranca_id?: string | null
          cobranca_provedor?: string | null
          cobranca_status?: string | null
          codigo?: number
          codigo_barras?: string | null
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          linha_digitavel?: string | null
          link_boleto?: string | null
          observacoes?: string | null
          pix_copia_cola?: string | null
          qr_code_base64?: string | null
          reagendamento_data?: string | null
          status?: Database["public"]["Enums"]["status_mensalidade"]
          tenant_id?: string | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          cobertura: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          taxa_adesao: number
          tenant_id: string | null
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          cobertura?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          taxa_adesao?: number
          tenant_id?: string | null
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          ativo?: boolean
          cobertura?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          taxa_adesao?: number
          tenant_id?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos_pendentes: {
        Row: {
          associado_id: string
          cobrador_id: string | null
          cobrador_nome: string
          conciliado_em: string | null
          conciliado_por: string | null
          conciliado_por_nome: string | null
          created_at: string
          created_by: string | null
          data_recebimento: string
          id: string
          mensalidade_id: string
          observacoes: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          valor_recebido: number
        }
        Insert: {
          associado_id: string
          cobrador_id?: string | null
          cobrador_nome: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conciliado_por_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_recebimento?: string
          id?: string
          mensalidade_id: string
          observacoes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          valor_recebido: number
        }
        Update: {
          associado_id?: string
          cobrador_id?: string | null
          cobrador_nome?: string
          conciliado_em?: string | null
          conciliado_por?: string | null
          conciliado_por_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_recebimento?: string
          id?: string
          mensalidade_id?: string
          observacoes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_pendentes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_pendentes_cobrador_id_fkey"
            columns: ["cobrador_id"]
            isOneToOne: false
            referencedRelation: "cobradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_pendentes_mensalidade_id_fkey"
            columns: ["mensalidade_id"]
            isOneToOne: false
            referencedRelation: "mensalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_pendentes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      servico_checklist: {
        Row: {
          concluido: boolean | null
          id: string
          item: string
          servico_id: string | null
        }
        Insert: {
          concluido?: boolean | null
          id?: string
          item: string
          servico_id?: string | null
        }
        Update: {
          concluido?: boolean | null
          id?: string
          item?: string
          servico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_checklist_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_funerarios"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_financeiro: {
        Row: {
          acrescimo: number | null
          desconto: number | null
          id: string
          servico_id: string | null
          status: string | null
          valor_final: number | null
          valor_total: number | null
        }
        Insert: {
          acrescimo?: number | null
          desconto?: number | null
          id?: string
          servico_id?: string | null
          status?: string | null
          valor_final?: number | null
          valor_total?: number | null
        }
        Update: {
          acrescimo?: number | null
          desconto?: number | null
          id?: string
          servico_id?: string | null
          status?: string | null
          valor_final?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_financeiro_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_funerarios"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_timeline: {
        Row: {
          created_at: string | null
          evento: string
          id: string
          servico_id: string | null
        }
        Insert: {
          created_at?: string | null
          evento: string
          id?: string
          servico_id?: string | null
        }
        Update: {
          created_at?: string | null
          evento?: string
          id?: string
          servico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_timeline_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_funerarios"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_funerarios: {
        Row: {
          agente_funerario: string | null
          associado_id: string | null
          atendente_nome: string | null
          autorizacao_responsavel: string | null
          auxiliar: string | null
          cartorio: string | null
          causa_morte: string | null
          cerimonialista: string | null
          cidade_obito: string | null
          combustivel: string | null
          created_at: string | null
          cremacao: boolean | null
          data_abertura: string | null
          data_obito: string | null
          dependente_id: string | null
          falecido_cpf: string | null
          falecido_data_nascimento: string | null
          falecido_endereco: string | null
          falecido_estado_civil: string | null
          falecido_nacionalidade: string | null
          falecido_naturalidade: string | null
          falecido_nome: string
          falecido_nome_mae: string | null
          falecido_nome_pai: string | null
          falecido_profissao: string | null
          falecido_rg: string | null
          falecido_sexo: string | null
          filial_id: string | null
          hora_obito: string | null
          hospital_obito: string | null
          id: string
          km_retorno: number | null
          km_saida: number | null
          local_obito: string | null
          medico_responsavel: string | null
          motorista: string | null
          numero_do: string | null
          numero_servico: number
          observacoes: string | null
          os_arquivos: Json
          os_assinada_url: string | null
          os_data: string | null
          os_hora: string | null
          os_materiais: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_endereco: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          responsavel_rg: string | null
          responsavel_telefone: string | null
          responsavel_whatsapp: string | null
          sepultamento_cemiterio: string | null
          sepultamento_cidade: string | null
          sepultamento_horario: string | null
          sepultamento_jazigo: string | null
          sepultamento_lote: string | null
          sepultamento_quadra: string | null
          status: Database["public"]["Enums"]["servico_status"] | null
          tanatopraxista: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["servico_tipo"]
          veiculo_placa: string | null
          velorio_capela: string | null
          velorio_cidade: string | null
          velorio_endereco: string | null
          velorio_inicio: string | null
          velorio_local: string | null
          velorio_termino: string | null
        }
        Insert: {
          agente_funerario?: string | null
          associado_id?: string | null
          atendente_nome?: string | null
          autorizacao_responsavel?: string | null
          auxiliar?: string | null
          cartorio?: string | null
          causa_morte?: string | null
          cerimonialista?: string | null
          cidade_obito?: string | null
          combustivel?: string | null
          created_at?: string | null
          cremacao?: boolean | null
          data_abertura?: string | null
          data_obito?: string | null
          dependente_id?: string | null
          falecido_cpf?: string | null
          falecido_data_nascimento?: string | null
          falecido_endereco?: string | null
          falecido_estado_civil?: string | null
          falecido_nacionalidade?: string | null
          falecido_naturalidade?: string | null
          falecido_nome: string
          falecido_nome_mae?: string | null
          falecido_nome_pai?: string | null
          falecido_profissao?: string | null
          falecido_rg?: string | null
          falecido_sexo?: string | null
          filial_id?: string | null
          hora_obito?: string | null
          hospital_obito?: string | null
          id?: string
          km_retorno?: number | null
          km_saida?: number | null
          local_obito?: string | null
          medico_responsavel?: string | null
          motorista?: string | null
          numero_do?: string | null
          numero_servico?: number
          observacoes?: string | null
          os_arquivos?: Json
          os_assinada_url?: string | null
          os_data?: string | null
          os_hora?: string | null
          os_materiais?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_endereco?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_rg?: string | null
          responsavel_telefone?: string | null
          responsavel_whatsapp?: string | null
          sepultamento_cemiterio?: string | null
          sepultamento_cidade?: string | null
          sepultamento_horario?: string | null
          sepultamento_jazigo?: string | null
          sepultamento_lote?: string | null
          sepultamento_quadra?: string | null
          status?: Database["public"]["Enums"]["servico_status"] | null
          tanatopraxista?: string | null
          tenant_id?: string | null
          tipo: Database["public"]["Enums"]["servico_tipo"]
          veiculo_placa?: string | null
          velorio_capela?: string | null
          velorio_cidade?: string | null
          velorio_endereco?: string | null
          velorio_inicio?: string | null
          velorio_local?: string | null
          velorio_termino?: string | null
        }
        Update: {
          agente_funerario?: string | null
          associado_id?: string | null
          atendente_nome?: string | null
          autorizacao_responsavel?: string | null
          auxiliar?: string | null
          cartorio?: string | null
          causa_morte?: string | null
          cerimonialista?: string | null
          cidade_obito?: string | null
          combustivel?: string | null
          created_at?: string | null
          cremacao?: boolean | null
          data_abertura?: string | null
          data_obito?: string | null
          dependente_id?: string | null
          falecido_cpf?: string | null
          falecido_data_nascimento?: string | null
          falecido_endereco?: string | null
          falecido_estado_civil?: string | null
          falecido_nacionalidade?: string | null
          falecido_naturalidade?: string | null
          falecido_nome?: string
          falecido_nome_mae?: string | null
          falecido_nome_pai?: string | null
          falecido_profissao?: string | null
          falecido_rg?: string | null
          falecido_sexo?: string | null
          filial_id?: string | null
          hora_obito?: string | null
          hospital_obito?: string | null
          id?: string
          km_retorno?: number | null
          km_saida?: number | null
          local_obito?: string | null
          medico_responsavel?: string | null
          motorista?: string | null
          numero_do?: string | null
          numero_servico?: number
          observacoes?: string | null
          os_arquivos?: Json
          os_assinada_url?: string | null
          os_data?: string | null
          os_hora?: string | null
          os_materiais?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_endereco?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_rg?: string | null
          responsavel_telefone?: string | null
          responsavel_whatsapp?: string | null
          sepultamento_cemiterio?: string | null
          sepultamento_cidade?: string | null
          sepultamento_horario?: string | null
          sepultamento_jazigo?: string | null
          sepultamento_lote?: string | null
          sepultamento_quadra?: string | null
          status?: Database["public"]["Enums"]["servico_status"] | null
          tanatopraxista?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["servico_tipo"]
          veiculo_placa?: string | null
          velorio_capela?: string | null
          velorio_cidade?: string | null
          velorio_endereco?: string | null
          velorio_inicio?: string | null
          velorio_local?: string | null
          velorio_termino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_funerarios_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_funerarios_dependente_id_fkey"
            columns: ["dependente_id"]
            isOneToOne: false
            referencedRelation: "dependentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_funerarios_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_funerarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          preco: number
          tenant_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          preco?: number
          tenant_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          tenant_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_produtos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_plans: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          limite_associados: number | null
          limite_usuarios: number | null
          nome: string
          periodo: Database["public"]["Enums"]["plan_period"] | null
          preco_anual: number | null
          preco_mensal: number
          preco_semestral: number | null
          recursos: Json | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          limite_associados?: number | null
          limite_usuarios?: number | null
          nome: string
          periodo?: Database["public"]["Enums"]["plan_period"] | null
          preco_anual?: number | null
          preco_mensal?: number
          preco_semestral?: number | null
          recursos?: Json | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          limite_associados?: number | null
          limite_usuarios?: number | null
          nome?: string
          periodo?: Database["public"]["Enums"]["plan_period"] | null
          preco_anual?: number | null
          preco_mensal?: number
          preco_semestral?: number | null
          recursos?: Json | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          cnpj: string | null
          configuracoes: Json | null
          created_at: string | null
          dominio: string | null
          email: string | null
          endereco: string | null
          expires_at: string | null
          id: string
          logo_url: string | null
          nome: string
          plan_id: string | null
          plan_status: string | null
          primary_color: string | null
          secondary_color: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subtitulo: string | null
          telefone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          expires_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plan_id?: string | null
          plan_status?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subtitulo?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          expires_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plan_id?: string | null
          plan_status?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subtitulo?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "system_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed: boolean
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_pins: {
        Row: {
          associado_id: string | null
          concorrente: string | null
          created_at: string
          data_retorno: string | null
          endereco: string | null
          id: string
          latitude: number
          longitude: number
          municipio: string | null
          nome: string
          observacoes: string | null
          plano_id: string | null
          status: string
          telefone: string | null
          tenant_id: string | null
          tipo_venda: string | null
          uf: string | null
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          associado_id?: string | null
          concorrente?: string | null
          created_at?: string
          data_retorno?: string | null
          endereco?: string | null
          id?: string
          latitude: number
          longitude: number
          municipio?: string | null
          nome: string
          observacoes?: string | null
          plano_id?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string | null
          tipo_venda?: string | null
          uf?: string | null
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          associado_id?: string | null
          concorrente?: string | null
          created_at?: string
          data_retorno?: string | null
          endereco?: string | null
          id?: string
          latitude?: number
          longitude?: number
          municipio?: string | null
          nome?: string
          observacoes?: string | null
          plano_id?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string | null
          tipo_venda?: string | null
          uf?: string | null
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_pins_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_pins_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_pins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          erro: string | null
          evento: string | null
          id: string
          mensalidade_id: string | null
          payload: Json
          processado: boolean
          provedor: string
        }
        Insert: {
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          mensalidade_id?: string | null
          payload: Json
          processado?: boolean
          provedor: string
        }
        Update: {
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          mensalidade_id?: string | null
          payload?: Json
          processado?: boolean
          provedor?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "vendedor" | "cobrador" | "agente"
      plan_period: "mensal" | "semestral" | "anual"
      servico_status:
        | "Em Atendimento"
        | "Preparação"
        | "Velório"
        | "Sepultamento"
        | "Finalizado"
        | "Cancelado"
        | "Aberta"
        | "Em Execução"
        | "Concluída"
        | "Cancelada"
      servico_tipo: "Plano" | "Particular" | "Convênio" | "Prefeitura"
      status_associado: "ativo" | "inativo" | "suspenso"
      status_conta: "pendente" | "pago" | "atrasado" | "cancelado"
      status_mensalidade: "pendente" | "pago" | "atrasado" | "cancelado"
      tipo_movimento: "entrada" | "saida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador", "vendedor", "cobrador", "agente"],
      plan_period: ["mensal", "semestral", "anual"],
      servico_status: [
        "Em Atendimento",
        "Preparação",
        "Velório",
        "Sepultamento",
        "Finalizado",
        "Cancelado",
        "Aberta",
        "Em Execução",
        "Concluída",
        "Cancelada",
      ],
      servico_tipo: ["Plano", "Particular", "Convênio", "Prefeitura"],
      status_associado: ["ativo", "inativo", "suspenso"],
      status_conta: ["pendente", "pago", "atrasado", "cancelado"],
      status_mensalidade: ["pendente", "pago", "atrasado", "cancelado"],
      tipo_movimento: ["entrada", "saida"],
    },
  },
} as const
