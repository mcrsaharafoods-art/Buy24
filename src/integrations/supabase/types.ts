export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string;
          doc_type: Database["public"]["Enums"]["document_type"];
          file_name: string;
          id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_at: string;
          user_id: string;
        };
        Insert: {
          application_id: string;
          doc_type: Database["public"]["Enums"]["document_type"];
          file_name: string;
          id?: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_at?: string;
          user_id: string;
        };
        Update: {
          application_id?: string;
          doc_type?: Database["public"]["Enums"]["document_type"];
          file_name?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "vendor_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      application_status_history: {
        Row: {
          application_id: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["application_status"] | null;
          id: string;
          note: string | null;
          performed_by: string | null;
          to_status: Database["public"]["Enums"]["application_status"];
        };
        Insert: {
          application_id: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["application_status"] | null;
          id?: string;
          note?: string | null;
          performed_by?: string | null;
          to_status: Database["public"]["Enums"]["application_status"];
        };
        Update: {
          application_id?: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["application_status"] | null;
          id?: string;
          note?: string | null;
          performed_by?: string | null;
          to_status?: Database["public"]["Enums"]["application_status"];
        };
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "vendor_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      otp_verifications: {
        Row: {
          attempts: number;
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          mobile: string;
          verified: boolean;
        };
        Insert: {
          attempts?: number;
          code: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          mobile: string;
          verified?: boolean;
        };
        Update: {
          attempts?: number;
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          mobile?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          mobile: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          mobile: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          mobile?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          images: Json;
          is_active: boolean;
          mrp: number;
          name: string;
          selling_price: number;
          stock: number;
          unit: string;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          images?: Json;
          is_active?: boolean;
          mrp: number;
          name: string;
          selling_price: number;
          stock?: number;
          unit: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          images?: Json;
          is_active?: boolean;
          mrp?: number;
          name?: string;
          selling_price?: number;
          stock?: number;
          unit?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          favicon_data_url: string | null;
          id: number;
          support_email: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          favicon_data_url?: string | null;
          id?: number;
          support_email?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          favicon_data_url?: string | null;
          id?: number;
          support_email?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vendor_applications: {
        Row: {
          account_holder_name: string;
          account_number: string;
          address_line: string | null;
          admin_message: string | null;
          application_code: string;
          bank_name: string;
          city: string;
          closing_time: string;
          created_at: string;
          delivery_radius_km: number;
          district: string;
          fssai_number: string | null;
          gst_number: string | null;
          home_delivery: boolean;
          id: string;
          ifsc: string;
          latitude: number | null;
          longitude: number | null;
          opening_time: string;
          pickup_available: boolean;
          pincode: string;
          rejection_reason: string | null;
          requested_reupload_docs: Database["public"]["Enums"]["document_type"][] | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          seller_type: Database["public"]["Enums"]["seller_type"];
          shop_name: string;
          state: string;
          status: Database["public"]["Enums"]["application_status"];
          submitted_at: string;
          terms_accepted_at: string;
          updated_at: string;
          upi_id: string | null;
          user_id: string;
        };
        Insert: {
          account_holder_name: string;
          account_number: string;
          address_line?: string | null;
          admin_message?: string | null;
          application_code: string;
          bank_name: string;
          city: string;
          closing_time: string;
          created_at?: string;
          delivery_radius_km: number;
          district: string;
          fssai_number?: string | null;
          gst_number?: string | null;
          home_delivery?: boolean;
          id?: string;
          ifsc: string;
          latitude?: number | null;
          longitude?: number | null;
          opening_time: string;
          pickup_available?: boolean;
          pincode: string;
          rejection_reason?: string | null;
          requested_reupload_docs?: Database["public"]["Enums"]["document_type"][] | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          seller_type: Database["public"]["Enums"]["seller_type"];
          shop_name: string;
          state: string;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          terms_accepted_at: string;
          updated_at?: string;
          upi_id?: string | null;
          user_id: string;
        };
        Update: {
          account_holder_name?: string;
          account_number?: string;
          address_line?: string | null;
          admin_message?: string | null;
          application_code?: string;
          bank_name?: string;
          city?: string;
          closing_time?: string;
          created_at?: string;
          delivery_radius_km?: number;
          district?: string;
          fssai_number?: string | null;
          gst_number?: string | null;
          home_delivery?: boolean;
          id?: string;
          ifsc?: string;
          latitude?: number | null;
          longitude?: number | null;
          opening_time?: string;
          pickup_available?: boolean;
          pincode?: string;
          rejection_reason?: string | null;
          requested_reupload_docs?: Database["public"]["Enums"]["document_type"][] | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          seller_type?: Database["public"]["Enums"]["seller_type"];
          shop_name?: string;
          state?: string;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          terms_accepted_at?: string;
          updated_at?: string;
          upi_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "vendor";
      application_status: "pending" | "approved" | "rejected" | "reupload_required";
      document_type: "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque";
      seller_type: "individual" | "proprietorship" | "partnership" | "private_limited" | "llp";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
      app_role: ["admin", "vendor"],
      application_status: ["pending", "approved", "rejected", "reupload_required"],
      document_type: ["aadhaar", "pan", "shop_photo", "shop_license", "cancelled_cheque"],
      seller_type: ["individual", "proprietorship", "partnership", "private_limited", "llp"],
    },
  },
} as const;
