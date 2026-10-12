export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          changes: NonNullable<Json>;
          entity_id: string;
          entity_type: string;
          id: number;
          occurred_at: string;
          organization_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          entity_id: string;
          entity_type: string;
          id?: never;
          occurred_at?: string;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          occurred_at?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      handovers: {
        Row: {
          acknowledged_at: string | null;
          created_at: string;
          from_user_id: string;
          id: string;
          organization_id: string;
          outstanding_tasks: string;
          status: Database["public"]["Enums"]["handover_status"];
          summary: string;
          to_user_id: string;
          updated_at: string;
          vessel_id: string | null;
          work_order_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          acknowledged_at?: string | null;
          created_at?: string;
          from_user_id: string;
          id?: string;
          organization_id: string;
          outstanding_tasks: string;
          status?: Database["public"]["Enums"]["handover_status"];
          summary: string;
          to_user_id: string;
          updated_at?: string;
          vessel_id?: string | null;
          work_order_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          created_at?: string;
          from_user_id?: string;
          id?: string;
          organization_id?: string;
          outstanding_tasks?: string;
          status?: Database["public"]["Enums"]["handover_status"];
          summary?: string;
          to_user_id?: string;
          updated_at?: string;
          vessel_id?: string | null;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "handovers_from_user_id_fkey";
            columns: ["from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handovers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handovers_to_user_id_fkey";
            columns: ["to_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handovers_vessel_id_organization_id_fkey";
            columns: ["vessel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "handovers_work_order_id_organization_id_fkey";
            columns: ["work_order_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      inspection_items: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          finding: string | null;
          id: string;
          inspection_id: string;
          organization_id: string;
          position: number;
          result: Database["public"]["Enums"]["check_result"];
          severity: Database["public"]["Enums"]["severity"] | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          finding?: string | null;
          id?: string;
          inspection_id: string;
          organization_id: string;
          position: number;
          result?: Database["public"]["Enums"]["check_result"];
          severity?: Database["public"]["Enums"]["severity"] | null;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          finding?: string | null;
          id?: string;
          inspection_id?: string;
          organization_id?: string;
          position?: number;
          result?: Database["public"]["Enums"]["check_result"];
          severity?: Database["public"]["Enums"]["severity"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_organization_id_fkey";
            columns: ["inspection_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      inspections: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          inspector_id: string | null;
          notes: string | null;
          organization_id: string;
          scheduled_for: string;
          status: Database["public"]["Enums"]["inspection_status"];
          title: string;
          updated_at: string;
          vessel_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inspector_id?: string | null;
          notes?: string | null;
          organization_id: string;
          scheduled_for: string;
          status?: Database["public"]["Enums"]["inspection_status"];
          title: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inspector_id?: string | null;
          notes?: string | null;
          organization_id?: string;
          scheduled_for?: string;
          status?: Database["public"]["Enums"]["inspection_status"];
          title?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_inspector_id_fkey";
            columns: ["inspector_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_vessel_id_organization_id_fkey";
            columns: ["vessel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vessels: {
        Row: {
          created_at: string;
          created_by: string | null;
          flag_state: string;
          gross_tonnage: number | null;
          id: string;
          imo_number: string;
          name: string;
          organization_id: string;
          status: Database["public"]["Enums"]["vessel_status"];
          updated_at: string;
          vessel_type: Database["public"]["Enums"]["vessel_type"];
          year_built: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          flag_state: string;
          gross_tonnage?: number | null;
          id?: string;
          imo_number: string;
          name: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["vessel_status"];
          updated_at?: string;
          vessel_type: Database["public"]["Enums"]["vessel_type"];
          year_built?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          flag_state?: string;
          gross_tonnage?: number | null;
          id?: string;
          imo_number?: string;
          name?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["vessel_status"];
          updated_at?: string;
          vessel_type?: Database["public"]["Enums"]["vessel_type"];
          year_built?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vessels_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vessels_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          assignee_id: string | null;
          blocked_reason: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          inspection_item_id: string | null;
          organization_id: string;
          priority: Database["public"]["Enums"]["severity"];
          status: Database["public"]["Enums"]["work_order_status"];
          title: string;
          updated_at: string;
          vessel_id: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          inspection_item_id?: string | null;
          organization_id: string;
          priority?: Database["public"]["Enums"]["severity"];
          status?: Database["public"]["Enums"]["work_order_status"];
          title: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          assignee_id?: string | null;
          blocked_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          inspection_item_id?: string | null;
          organization_id?: string;
          priority?: Database["public"]["Enums"]["severity"];
          status?: Database["public"]["Enums"]["work_order_status"];
          title?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_inspection_item_id_organization_id_fkey";
            columns: ["inspection_item_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "inspection_items";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_vessel_id_organization_id_fkey";
            columns: ["vessel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_inspection: {
        Args: {
          p_inspector_id: string;
          p_items: Json;
          p_notes: string;
          p_scheduled_for: string;
          p_title: string;
          p_vessel_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      check_result: "pending" | "pass" | "fail" | "not_applicable";
      handover_status: "pending" | "acknowledged";
      inspection_status:
        "scheduled" | "in_progress" | "completed" | "cancelled";
      org_role: "admin" | "manager" | "inspector" | "technician" | "viewer";
      severity: "low" | "medium" | "high" | "critical";
      vessel_status: "active" | "in_maintenance" | "laid_up" | "decommissioned";
      vessel_type:
        | "bulk_carrier"
        | "tanker"
        | "container"
        | "general_cargo"
        | "offshore_support"
        | "passenger"
        | "tug"
        | "other";
      work_order_status: "open" | "in_progress" | "blocked" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      check_result: ["pending", "pass", "fail", "not_applicable"],
      handover_status: ["pending", "acknowledged"],
      inspection_status: ["scheduled", "in_progress", "completed", "cancelled"],
      org_role: ["admin", "manager", "inspector", "technician", "viewer"],
      severity: ["low", "medium", "high", "critical"],
      vessel_status: ["active", "in_maintenance", "laid_up", "decommissioned"],
      vessel_type: [
        "bulk_carrier",
        "tanker",
        "container",
        "general_cargo",
        "offshore_support",
        "passenger",
        "tug",
        "other",
      ],
      work_order_status: ["open", "in_progress", "blocked", "completed"],
    },
  },
} as const;
