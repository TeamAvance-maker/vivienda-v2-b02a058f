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
      deliveries: {
        Row: {
          created_at: string
          date: string
          id: string
          mode: Database["public"]["Enums"]["delivery_mode"]
          note: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          mode: Database["public"]["Enums"]["delivery_mode"]
          note?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mode?: Database["public"]["Enums"]["delivery_mode"]
          note?: string
        }
        Relationships: []
      }
      delivery_houses: {
        Row: {
          delivery_id: string
          house_type_code: string
          id: string
          qty: number
        }
        Insert: {
          delivery_id: string
          house_type_code: string
          id?: string
          qty: number
        }
        Update: {
          delivery_id?: string
          house_type_code?: string
          id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_houses_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_houses_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "delivery_houses_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "v_houses_executed"
            referencedColumns: ["house_type_code"]
          },
        ]
      }
      delivery_items: {
        Row: {
          delivery_id: string
          handedness: Database["public"]["Enums"]["handedness"]
          id: string
          material_code: string
          qty: number
        }
        Insert: {
          delivery_id: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code: string
          qty: number
        }
        Update: {
          delivery_id?: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      house_exec_overrides: {
        Row: {
          created_at: string
          date: string
          delta: number
          house_type_code: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          date?: string
          delta: number
          house_type_code: string
          id?: string
          reason?: string
        }
        Update: {
          created_at?: string
          date?: string
          delta?: number
          house_type_code?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_exec_overrides_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "house_exec_overrides_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "v_houses_executed"
            referencedColumns: ["house_type_code"]
          },
        ]
      }
      house_material_req: {
        Row: {
          handedness: Database["public"]["Enums"]["handedness"]
          house_type_code: string
          id: string
          material_code: string
          qty: number
        }
        Insert: {
          handedness?: Database["public"]["Enums"]["handedness"]
          house_type_code: string
          id?: string
          material_code: string
          qty: number
        }
        Update: {
          handedness?: Database["public"]["Enums"]["handedness"]
          house_type_code?: string
          id?: string
          material_code?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "house_material_req_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "house_material_req_house_type_code_fkey"
            columns: ["house_type_code"]
            isOneToOne: false
            referencedRelation: "v_houses_executed"
            referencedColumns: ["house_type_code"]
          },
          {
            foreignKeyName: "house_material_req_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      house_types: {
        Row: {
          code: string
          created_at: string
          name: string
          qty: number
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          name?: string
          qty?: number
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          name?: string
          qty?: number
          sort_order?: number
        }
        Relationships: []
      }
      inventory_counts: {
        Row: {
          counted_qty: number
          created_at: string
          date: string
          handedness: Database["public"]["Enums"]["handedness"]
          id: string
          material_code: string
          note: string
        }
        Insert: {
          counted_qty: number
          created_at?: string
          date?: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code: string
          note?: string
        }
        Update: {
          counted_qty?: number
          created_at?: string
          date?: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      materials: {
        Row: {
          code: string
          created_at: string
          description: string
          sort_order: number
          tracks_handedness: boolean
          unit: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          sort_order?: number
          tracks_handedness?: boolean
          unit?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          sort_order?: number
          tracks_handedness?: boolean
          unit?: string
        }
        Relationships: []
      }
      project_config: {
        Row: {
          critical_stock_threshold: number
          id: number
          name: string
          total_houses: number
          updated_at: string
        }
        Insert: {
          critical_stock_threshold?: number
          id?: number
          name?: string
          total_houses?: number
          updated_at?: string
        }
        Update: {
          critical_stock_threshold?: number
          id?: number
          name?: string
          total_houses?: number
          updated_at?: string
        }
        Relationships: []
      }
      receptions: {
        Row: {
          created_at: string
          date: string
          guia: string
          handedness: Database["public"]["Enums"]["handedness"]
          id: string
          material_code: string
          qty: number
        }
        Insert: {
          created_at?: string
          date?: string
          guia?: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code: string
          qty: number
        }
        Update: {
          created_at?: string
          date?: string
          guia?: string
          handedness?: Database["public"]["Enums"]["handedness"]
          id?: string
          material_code?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "receptions_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      v_delivered: {
        Row: {
          handedness: Database["public"]["Enums"]["handedness"] | null
          material_code: string | null
          qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      v_houses_executed: {
        Row: {
          house_type_code: string | null
          qty: number | null
        }
        Relationships: []
      }
      v_received: {
        Row: {
          handedness: Database["public"]["Enums"]["handedness"] | null
          material_code: string | null
          qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receptions_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      v_required: {
        Row: {
          handedness: Database["public"]["Enums"]["handedness"] | null
          material_code: string | null
          qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "house_material_req_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      v_stock: {
        Row: {
          handedness: Database["public"]["Enums"]["handedness"] | null
          material_code: string | null
          qty: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delivery_mode: "manual" | "by_house"
      handedness: "left" | "right" | "none"
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
      delivery_mode: ["manual", "by_house"],
      handedness: ["left", "right", "none"],
    },
  },
} as const
