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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          event_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          status: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          event_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_blocks: {
        Row: {
          created_at: string
          end_time: string | null
          ends_at: string | null
          id: string
          label: string | null
          repeat: string
          start_time: string | null
          starts_at: string | null
          time_zone: string | null
          until_date: string | null
          user_id: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          repeat: string
          start_time?: string | null
          starts_at?: string | null
          time_zone?: string | null
          until_date?: string | null
          user_id?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          repeat?: string
          start_time?: string | null
          starts_at?: string | null
          time_zone?: string | null
          until_date?: string | null
          user_id?: string
          weekday?: number | null
        }
        Relationships: []
      }
      bring_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          label: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          label: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "bring_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_date_options: {
        Row: {
          created_at: string
          ends_at: string
          event_id: string
          id: string
          starts_at: string
          suggested_by: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          event_id: string
          id?: string
          starts_at: string
          suggested_by?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          event_id?: string
          id?: string
          starts_at?: string
          suggested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_date_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_responses: {
        Row: {
          option_id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          option_id: string
          response: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          option_id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "event_date_options"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          confirmed_option_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          group_id: string
          id: string
          load_in_at: string | null
          notes: string | null
          soundcheck_at: string | null
          starts_at: string | null
          status: string
          title: string | null
          type: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          confirmed_option_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          group_id: string
          id?: string
          load_in_at?: string | null
          notes?: string | null
          soundcheck_at?: string | null
          starts_at?: string | null
          status?: string
          title?: string | null
          type: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          confirmed_option_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          group_id?: string
          id?: string
          load_in_at?: string | null
          notes?: string | null
          soundcheck_at?: string | null
          starts_at?: string | null
          status?: string
          title?: string | null
          type?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_confirmed_option_fkey"
            columns: ["confirmed_option_id"]
            isOneToOne: false
            referencedRelation: "event_date_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_modules: {
        Row: {
          group_id: string
          module: string
        }
        Insert: {
          group_id: string
          module: string
        }
        Update: {
          group_id?: string
          module?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_modules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          accent_color: string
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_path: string | null
          name: string
          template: string
        }
        Insert: {
          accent_color?: string
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_path?: string | null
          name: string
          template: string
        }
        Update: {
          accent_color?: string
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          template?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          group_id: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          group_id: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          instruments: string[]
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          instruments?: string[]
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instruments?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_event: { Args: { p_event_id: string }; Returns: undefined }
      confirm_event: {
        Args: { p_event_id: string; p_option_id: string }
        Returns: undefined
      }
      create_event_request: {
        Args: {
          p_group_id: string
          p_notes: string
          p_options: Json
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_group: {
        Args: { p_name: string; p_template: string }
        Returns: string
      }
      create_invite: { Args: { p_group_id: string }; Returns: string }
      get_invite: {
        Args: { p_code: string }
        Returns: {
          already_member: boolean
          group_id: string
          group_name: string
          template: string
        }[]
      }
      group_busy: {
        Args: { p_from: string; p_group_id: string; p_to: string }
        Returns: {
          ends_at: string
          starts_at: string
          user_id: string
        }[]
      }
      join_group: { Args: { p_code: string }; Returns: string }
      suggest_event_option: {
        Args: { p_ends_at: string; p_event_id: string; p_starts_at: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
