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
          is_active: boolean;
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
          is_active?: boolean;
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
          is_active?: boolean;
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
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
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
