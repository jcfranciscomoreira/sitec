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
      centros_custo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      contas_financeiras: {
        Row: {
          categoria: string | null
          centro_custo_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          descricao: string
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
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          descricao: string
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
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          descricao?: string
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
            foreignKeyName: "contas_financeiras_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
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
      mensalidades: {
        Row: {
          agente_recebimento: string | null
          associado_id: string
          codigo: number
          competencia: string
          created_at: string
          data_pagamento: string | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_mensalidade"]
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          agente_recebimento?: string | null
          associado_id: string
          codigo?: number
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_mensalidade"]
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          agente_recebimento?: string | null
          associado_id?: string
          codigo?: number
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
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
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador"
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
      app_role: ["admin", "operador"],
      status_associado: ["ativo", "inativo", "suspenso"],
      status_conta: ["pendente", "pago", "atrasado", "cancelado"],
      status_mensalidade: ["pendente", "pago", "atrasado", "cancelado"],
      tipo_movimento: ["entrada", "saida"],
    },
  },
} as const
