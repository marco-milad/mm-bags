// Generated to match Supabase's `gen types typescript` output for the schema in
// supabase/migrations/0001_init.sql. Re-run by hand or replace with:
//   npx supabase gen types typescript --project-id nrlcypdrfmjdwuvuaryp > lib/supabase/types.ts
// after `supabase login`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "card" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type NotificationChannel = "email" | "whatsapp";

// ─── ERP enums (see supabase/migrations/0003_erp_schema.sql) ──────────────
export type StaffRole = "cashier" | "manager" | "admin";
export type PosPaymentMethod = "cash" | "e-wallet" | "instapay" | "card";
export type PurchaseOrderStatus = "pending" | "received" | "partial" | "paid";
export type StockMovementType =
  | "purchase_in"
  | "online_sale"
  | "pos_sale"
  | "adjustment"
  | "return"
  | "transfer";

export interface ShippingAddress {
  name: string;
  phone: string;
  email?: string | null;
  governorate: string;
  governorate_code?: string;
  city: string;
  street: string;
  building?: string | null;
  notes?: string | null;
}

export interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  note?: string;
}

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          cover_image: string | null;
          sort_order: number;
          is_active: boolean;
          parent_slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          cover_image?: string | null;
          sort_order?: number;
          is_active?: boolean;
          parent_slug?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          cover_image?: string | null;
          sort_order?: number;
          is_active?: boolean;
          parent_slug?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          slug: string;
          collection_id: string | null;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          base_price: number;
          sale_price: number | null;
          images: string[];
          tags: string[];
          material_ar: string | null;
          material_en: string | null;
          weight_kg: number | null;
          // === Product specifications (migration: add_product_specifications_columns) ===
          dimensions: string | null;
          laptop_inches: number | null;
          material_type: string | null;
          wheel_type: string | null;
          lock_type: string | null;
          capacity_liters: number | null;
          is_water_resistant: boolean;
          is_expandable: boolean;
          // === /specs ===
          // 'cover' (default) crops images to fill the container. 'contain'
          // letterboxes with padding so the full bag is visible — use for
          // product-on-white photography with non-square source ratios.
          image_fit: "cover" | "contain";
          // Source image orientation; controls aspect ratio of the gallery
          // container. 'landscape' suits Milano sources (~1.4), 'portrait'
          // suits Calvin Klein sources (~0.75), 'square' is the default.
          image_aspect: "square" | "landscape" | "portrait";
          is_active: boolean;
          // show_in_store=true + is_active=false → POS-only product
          // (rings up at the till, hidden from /catalog).
          show_in_store: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          collection_id?: string | null;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          base_price: number;
          sale_price?: number | null;
          images?: string[];
          tags?: string[];
          material_ar?: string | null;
          material_en?: string | null;
          weight_kg?: number | null;
          dimensions?: string | null;
          laptop_inches?: number | null;
          material_type?: string | null;
          wheel_type?: string | null;
          lock_type?: string | null;
          capacity_liters?: number | null;
          is_water_resistant?: boolean;
          is_expandable?: boolean;
          image_fit?: "cover" | "contain";
          image_aspect?: "square" | "landscape" | "portrait";
          is_active?: boolean;
          show_in_store?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          collection_id?: string | null;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          base_price?: number;
          sale_price?: number | null;
          images?: string[];
          tags?: string[];
          material_ar?: string | null;
          material_en?: string | null;
          weight_kg?: number | null;
          dimensions?: string | null;
          laptop_inches?: number | null;
          material_type?: string | null;
          wheel_type?: string | null;
          lock_type?: string | null;
          capacity_liters?: number | null;
          is_water_resistant?: boolean;
          is_expandable?: boolean;
          image_fit?: "cover" | "contain";
          image_aspect?: "square" | "landscape" | "portrait";
          is_active?: boolean;
          show_in_store?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string | null;
          color_ar: string | null;
          color_en: string | null;
          color_hex: string | null;
          size_inches: number | null;
          size_label_ar: string | null;
          is_set: boolean;
          sku: string | null;
          stock_qty: number;
          price_override: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          color_ar?: string | null;
          color_en?: string | null;
          color_hex?: string | null;
          size_inches?: number | null;
          size_label_ar?: string | null;
          is_set?: boolean;
          sku?: string | null;
          stock_qty?: number;
          price_override?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          color_ar?: string | null;
          color_en?: string | null;
          color_hex?: string | null;
          size_inches?: number | null;
          size_label_ar?: string | null;
          is_set?: boolean;
          sku?: string | null;
          stock_qty?: number;
          price_override?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          status: OrderStatus;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          paymob_order_id: string | null;
          subtotal: number;
          shipping_fee: number;
          discount_amount: number;
          loyalty_discount: number;
          total: number;
          shipping_address: ShippingAddress;
          referral_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          status?: OrderStatus;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          paymob_order_id?: string | null;
          subtotal: number;
          shipping_fee?: number;
          discount_amount?: number;
          loyalty_discount?: number;
          total: number;
          shipping_address: ShippingAddress;
          referral_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          status?: OrderStatus;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          paymob_order_id?: string | null;
          subtotal?: number;
          shipping_fee?: number;
          discount_amount?: number;
          loyalty_discount?: number;
          total?: number;
          shipping_address?: ShippingAddress;
          referral_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string | null;
          variant_id: string | null;
          product_id: string | null;
          qty: number;
          unit_price: number;
          snapshot_name: string | null;
          snapshot_image: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          variant_id?: string | null;
          product_id?: string | null;
          qty: number;
          unit_price: number;
          snapshot_name?: string | null;
          snapshot_image?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          variant_id?: string | null;
          product_id?: string | null;
          qty?: number;
          unit_price?: number;
          snapshot_name?: string | null;
          snapshot_image?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };

      cod_tracking: {
        Row: {
          id: string;
          order_id: string | null;
          courier_name: string | null;
          tracking_number: string | null;
          current_status: string | null;
          current_location: string | null;
          estimated_delivery: string | null;
          events: TrackingEvent[];
          last_updated: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          courier_name?: string | null;
          tracking_number?: string | null;
          current_status?: string | null;
          current_location?: string | null;
          estimated_delivery?: string | null;
          events?: TrackingEvent[];
          last_updated?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          courier_name?: string | null;
          tracking_number?: string | null;
          current_status?: string | null;
          current_location?: string | null;
          estimated_delivery?: string | null;
          events?: TrackingEvent[];
          last_updated?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cod_tracking_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };

      wishlists: {
        Row: {
          id: string;
          user_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          added_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };

      reviews: {
        Row: {
          id: string;
          product_id: string | null;
          user_id: string | null;
          guest_name: string | null;
          governorate: string | null;
          rating: number;
          title: string | null;
          body: string | null;
          images: string[];
          verified_purchase: boolean;
          is_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          user_id?: string | null;
          guest_name?: string | null;
          governorate?: string | null;
          rating: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          verified_purchase?: boolean;
          is_approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          user_id?: string | null;
          guest_name?: string | null;
          governorate?: string | null;
          rating?: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          verified_purchase?: boolean;
          is_approved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      notification_subscriptions: {
        Row: {
          id: string;
          product_id: string | null;
          variant_id: string | null;
          user_id: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          channel: NotificationChannel;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          user_id?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          channel: NotificationChannel;
          notified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          user_id?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          channel?: NotificationChannel;
          notified?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_subscriptions_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          locale: "ar" | "en";
          subscribed_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          locale: "ar" | "en";
          subscribed_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          locale?: "ar" | "en";
          subscribed_at?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };

      // ─── ERP tables (added by 0003_erp_schema.sql) ──────────────────
      suppliers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          notes: string | null;
          total_paid: number;
          total_owed: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          total_paid?: number;
          total_owed?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          total_paid?: number;
          total_owed?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      purchase_orders: {
        Row: {
          id: string;
          supplier_id: string | null;
          order_date: string;
          total_cost: number;
          amount_paid: number;
          amount_owed: number;
          status: PurchaseOrderStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id?: string | null;
          order_date?: string;
          total_cost?: number;
          amount_paid?: number;
          amount_owed?: number;
          status?: PurchaseOrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string | null;
          order_date?: string;
          total_cost?: number;
          amount_paid?: number;
          amount_owed?: number;
          status?: PurchaseOrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };

      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          qty: number;
          unit_cost: number;
          total_cost: number; // generated
        };
        Insert: {
          id?: string;
          purchase_order_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          qty: number;
          unit_cost: number;
          // total_cost is GENERATED, never written.
        };
        Update: {
          id?: string;
          purchase_order_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          qty?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };

      staff: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          phone: string | null;
          role: StaffRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          phone?: string | null;
          role?: StaffRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          phone?: string | null;
          role?: StaffRole;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      pos_sales: {
        Row: {
          id: string;
          sale_number: string;
          cashier_id: string | null;
          subtotal: number;
          discount_amount: number;
          total: number;
          payment_method: PosPaymentMethod;
          payment_ref: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_number: string;
          cashier_id?: string | null;
          subtotal: number;
          discount_amount?: number;
          total: number;
          payment_method: PosPaymentMethod;
          payment_ref?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_number?: string;
          cashier_id?: string | null;
          subtotal?: number;
          discount_amount?: number;
          total?: number;
          payment_method?: PosPaymentMethod;
          payment_ref?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sales_cashier_id_fkey";
            columns: ["cashier_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };

      pos_sale_items: {
        Row: {
          id: string;
          sale_id: string | null;
          variant_id: string | null;
          product_id: string | null;
          qty: number;
          unit_price: number;
          total_price: number; // generated
          snapshot_name: string | null;
          snapshot_color: string | null;
          snapshot_size: string | null;
        };
        Insert: {
          id?: string;
          sale_id?: string | null;
          variant_id?: string | null;
          product_id?: string | null;
          qty: number;
          unit_price: number;
          // total_price is GENERATED, never written.
          snapshot_name?: string | null;
          snapshot_color?: string | null;
          snapshot_size?: string | null;
        };
        Update: {
          id?: string;
          sale_id?: string | null;
          variant_id?: string | null;
          product_id?: string | null;
          qty?: number;
          unit_price?: number;
          snapshot_name?: string | null;
          snapshot_color?: string | null;
          snapshot_size?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "pos_sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sale_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };

      stock_movements: {
        Row: {
          id: string;
          variant_id: string | null;
          product_id: string | null;
          type: StockMovementType;
          qty_change: number;
          qty_before: number;
          qty_after: number;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id?: string | null;
          product_id?: string | null;
          type: StockMovementType;
          qty_change: number;
          qty_before: number;
          qty_after: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string | null;
          product_id?: string | null;
          type?: StockMovementType;
          qty_change?: number;
          qty_before?: number;
          qty_after?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };

      // ─── Storefront merchandising (0006_homepage_featured_products.sql) ──
      homepage_featured_products: {
        Row: {
          id: string;
          product_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "homepage_featured_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: Record<string, never>;
    Functions: {
      deduct_stock_atomic: {
        Args: {
          p_variant_id: string;
          p_qty: number;
          p_reference_type: string;
          p_reference_id: string;
          p_created_by: string | null;
          p_movement_type?: StockMovementType;
        };
        Returns: void;
      };
      is_active_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// =====================
// Convenience aliases
// =====================

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Collection = Tables<"collections">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type CodTracking = Tables<"cod_tracking">;
export type Wishlist = Tables<"wishlists">;
export type Review = Tables<"reviews">;
export type NotificationSubscription = Tables<"notification_subscriptions">;

// ─── ERP aliases ──────────────────────────────────────────────────────────
export type Supplier = Tables<"suppliers">;
export type PurchaseOrder = Tables<"purchase_orders">;
export type PurchaseOrderItem = Tables<"purchase_order_items">;
export type Staff = Tables<"staff">;
export type PosSale = Tables<"pos_sales">;
export type PosSaleItem = Tables<"pos_sale_items">;
export type StockMovement = Tables<"stock_movements">;
export type HomepageFeaturedProduct = Tables<"homepage_featured_products">;
