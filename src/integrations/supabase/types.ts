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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      balance_transactions: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          current_uses: number | null
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          current_uses?: number | null
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Relationships: []
      }
      delivery_logs: {
        Row: {
          buyer_id: string | null
          credential_delivered: string
          delivered_at: string
          id: string
          order_id: string | null
          stock_id: string | null
          variation_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          credential_delivered: string
          delivered_at?: string
          id?: string
          order_id?: string | null
          stock_id?: string | null
          variation_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          credential_delivered?: string
          delivered_at?: string
          id?: string
          order_id?: string | null
          stock_id?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_logs_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "product_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lzt_accounts: {
        Row: {
          buyer_id: string | null
          category_id: string
          data: Json | null
          id: string
          imported_at: string
          lzt_item_id: string
          price_brl: number
          price_usd: number
          sold_at: string | null
          sold_price: number | null
          status: string
          title: string | null
        }
        Insert: {
          buyer_id?: string | null
          category_id: string
          data?: Json | null
          id?: string
          imported_at?: string
          lzt_item_id: string
          price_brl?: number
          price_usd?: number
          sold_at?: string | null
          sold_price?: number | null
          status?: string
          title?: string | null
        }
        Update: {
          buyer_id?: string | null
          category_id?: string
          data?: Json | null
          id?: string
          imported_at?: string
          lzt_item_id?: string
          price_brl?: number
          price_usd?: number
          sold_at?: string | null
          sold_price?: number | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lzt_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lzt_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lzt_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lzt_categories_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lzt_categories: {
        Row: {
          account_limit: number
          api_url: string
          auto_delete_reimport: boolean
          auto_import: boolean
          created_at: string
          icon_url: string | null
          id: string
          last_import_at: string | null
          margin_percent: number
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          account_limit?: number
          api_url?: string
          auto_delete_reimport?: boolean
          auto_import?: boolean
          created_at?: string
          icon_url?: string | null
          id?: string
          last_import_at?: string | null
          margin_percent?: number
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          account_limit?: number
          api_url?: string
          auto_delete_reimport?: boolean
          auto_import?: boolean
          created_at?: string
          icon_url?: string | null
          id?: string
          last_import_at?: string | null
          margin_percent?: number
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          delivered_at: string | null
          fortnite_username: string | null
          id: string
          lzt_account_id: string | null
          lzt_item_id: string | null
          lzt_reserved_credentials: Json | null
          payment_id: string | null
          payment_method: string | null
          pix_bank_code: string | null
          pix_client_doc: string | null
          pix_client_name: string | null
          pix_e2eid: string | null
          pix_institution: string | null
          pix_key: string | null
          product_id: string | null
          quantity: number
          status: string
          total_price: number
          updated_at: string
          user_id: string | null
          variation_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          delivered_at?: string | null
          fortnite_username?: string | null
          id?: string
          lzt_account_id?: string | null
          lzt_item_id?: string | null
          lzt_reserved_credentials?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          pix_bank_code?: string | null
          pix_client_doc?: string | null
          pix_client_name?: string | null
          pix_e2eid?: string | null
          pix_institution?: string | null
          pix_key?: string | null
          product_id?: string | null
          quantity?: number
          status?: string
          total_price: number
          updated_at?: string
          user_id?: string | null
          variation_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          delivered_at?: string | null
          fortnite_username?: string | null
          id?: string
          lzt_account_id?: string | null
          lzt_item_id?: string | null
          lzt_reserved_credentials?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          pix_bank_code?: string | null
          pix_client_doc?: string | null
          pix_client_name?: string | null
          pix_e2eid?: string | null
          pix_institution?: string | null
          pix_key?: string | null
          product_id?: string | null
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          added_at: string
          buyer_id: string | null
          credential: string
          id: string
          order_id: string | null
          sold_at: string | null
          status: string
          variation_id: string
        }
        Insert: {
          added_at?: string
          buyer_id?: string | null
          credential: string
          id?: string
          order_id?: string | null
          sold_at?: string | null
          status?: string
          variation_id: string
        }
        Update: {
          added_at?: string
          buyer_id?: string | null
          credential?: string
          id?: string
          order_id?: string | null
          sold_at?: string | null
          status?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          active: boolean
          created_at: string
          credential_type: string
          id: string
          name: string
          original_price: number | null
          price: number
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credential_type?: string
          id?: string
          name: string
          original_price?: number | null
          price: number
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credential_type?: string
          id?: string
          name?: string
          original_price?: number | null
          price?: number
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number | null
          created_at: string
          discord_id: string | null
          display_name: string | null
          email: string | null
          id: string
          restorecord_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          restorecord_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          restorecord_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          emoji: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
          visible: boolean | null
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
          visible?: boolean | null
        }
        Update: {
          created_at?: string
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vbucks_products: {
        Row: {
          active: boolean | null
          amount: number
          created_at: string
          id: string
          original_price: number | null
          popular: boolean | null
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          amount: number
          created_at?: string
          id?: string
          original_price?: number | null
          popular?: boolean | null
          price: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          amount?: number
          created_at?: string
          id?: string
          original_price?: number | null
          popular?: boolean | null
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      lzt_categories_public: {
        Row: {
          account_limit: number | null
          created_at: string | null
          icon_url: string | null
          id: string | null
          margin_percent: number | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          account_limit?: number | null
          created_at?: string | null
          icon_url?: string | null
          id?: string | null
          margin_percent?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          account_limit?: number | null
          created_at?: string | null
          icon_url?: string | null
          id?: string | null
          margin_percent?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
