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
        ]
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
          total_qtd?: number
          total_valor?: number
        }
        Relationships: []
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
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
          status: Database["public"]["Enums"]["status_conta"]
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
          status?: Database["public"]["Enums"]["status_conta"]
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
          status?: Database["public"]["Enums"]["status_conta"]
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
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          key: string
          label: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      mensalidades: {
        Row: {
          agente_recebimento: string | null
          associado_id: string
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
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          agente_recebimento?: string | null
          associado_id: string
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
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          agente_recebimento?: string | null
          associado_id?: string
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
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
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
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "operador" | "vendedor" | "cobrador" | "agente"
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
