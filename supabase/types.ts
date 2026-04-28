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
      bot_actions: {
        Row: {
          action_type: string
          bot_name: string
          created_at: string
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_payload: Json
          metrics_after: Json
          metrics_before: Json
          objective: string
          output_payload: Json
          priority: number
          retry_count: number
          run_id: string
          started_at: string | null
          status: string
          target_entity: string | null
          target_id: string | null
        }
        Insert: {
          action_type: string
          bot_name: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          metrics_after?: Json
          metrics_before?: Json
          objective: string
          output_payload?: Json
          priority?: number
          retry_count?: number
          run_id: string
          started_at?: string | null
          status: string
          target_entity?: string | null
          target_id?: string | null
        }
        Update: {
          action_type?: string
          bot_name?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          metrics_after?: Json
          metrics_before?: Json
          objective?: string
          output_payload?: Json
          priority?: number
          retry_count?: number
          run_id?: string
          started_at?: string | null
          status?: string
          target_entity?: string | null
          target_id?: string | null
        }
        Relationships: []
      }
      bot_policies: {
        Row: {
          allowed_actions: Json
          created_at: string
          description: string | null
          heal_threshold: number
          id: string
          is_active: boolean
          policy_mode: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json
          created_at?: string
          description?: string | null
          heal_threshold?: number
          id?: string
          is_active?: boolean
          policy_mode?: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json
          created_at?: string
          description?: string | null
          heal_threshold?: number
          id?: string
          is_active?: boolean
          policy_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_deleted: boolean
          room_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_slots: {
        Row: {
          created_at: string
          fee_thb: number
          id: string
          is_active: boolean
          max_orders: number
          shop_id: string
          slot_date: string
          slot_end: string
          slot_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_thb?: number
          id?: string
          is_active?: boolean
          max_orders?: number
          shop_id: string
          slot_date: string
          slot_end: string
          slot_start: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_thb?: number
          id?: string
          is_active?: boolean
          max_orders?: number
          shop_id?: string
          slot_date?: string
          slot_end?: string
          slot_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      dotori_events: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: number
          profile_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: string
          id?: never
          profile_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: never
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotori_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotori_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      dotori_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          idempotency_key: string
          metadata: Json
          profile_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          idempotency_key: string
          metadata?: Json
          profile_id: string
          reason: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          idempotency_key?: string
          metadata?: Json
          profile_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotori_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotori_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      ilchon_dm_messages: {
        Row: {
          body: string
          created_at: string
          from_user_id: string
          id: string
          is_read: boolean
          read_at: string | null
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_user_id: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_user_id?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilchon_dm_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_dm_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ilchon_dm_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_dm_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      ilchon_links: {
        Row: {
          created_at: string
          my_nickname_for_peer: string
          peer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          my_nickname_for_peer: string
          peer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          my_nickname_for_peer?: string
          peer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilchon_links_peer_id_fkey"
            columns: ["peer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_links_peer_id_fkey"
            columns: ["peer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ilchon_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      ilchon_presence: {
        Row: {
          active_peer_id: string | null
          is_online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active_peer_id?: string | null
          is_online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active_peer_id?: string | null
          is_online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilchon_presence_active_peer_id_fkey"
            columns: ["active_peer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_presence_active_peer_id_fkey"
            columns: ["active_peer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ilchon_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      ilchon_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          proposed_nickname_for_peer: string | null
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          proposed_nickname_for_peer?: string | null
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          proposed_nickname_for_peer?: string | null
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilchon_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ilchon_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilchon_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          rss_url: string | null
          search_query: string | null
          url_list_json: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          rss_url?: string | null
          search_query?: string | null
          url_list_json?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          rss_url?: string | null
          search_query?: string | null
          url_list_json?: Json | null
        }
        Relationships: []
      }
      knowledge_summaries: {
        Row: {
          id: string
          model: string | null
          processed_knowledge_id: string
          summary_text: string
        }
        Insert: {
          id?: string
          model?: string | null
          processed_knowledge_id: string
          summary_text: string
        }
        Update: {
          id?: string
          model?: string | null
          processed_knowledge_id?: string
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_summaries_processed_knowledge_id_fkey"
            columns: ["processed_knowledge_id"]
            isOneToOne: false
            referencedRelation: "processed_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      local_businesses: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          discount: string | null
          emoji: string
          has_discount: boolean
          id: string
          image_url: string | null
          image_urls: string[]
          is_active: boolean
          is_recommended: boolean
          kakao_id: string | null
          line_id: string | null
          map_url: string | null
          mini_home: Json
          name: string
          owner_id: string | null
          phone: string | null
          price_range: string | null
          region: string
          slug: string
          tags: string[]
          tier: string
          updated_at: string
          view_count: number
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          discount?: string | null
          emoji?: string
          has_discount?: boolean
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          is_recommended?: boolean
          kakao_id?: string | null
          line_id?: string | null
          map_url?: string | null
          mini_home?: Json
          name: string
          owner_id?: string | null
          phone?: string | null
          price_range?: string | null
          region?: string
          slug: string
          tags?: string[]
          tier?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount?: string | null
          emoji?: string
          has_discount?: boolean
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          is_recommended?: boolean
          kakao_id?: string | null
          line_id?: string | null
          map_url?: string | null
          mini_home?: Json
          name?: string
          owner_id?: string | null
          phone?: string | null
          price_range?: string | null
          region?: string
          slug?: string
          tags?: string[]
          tier?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "local_businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      local_shop_delivery_requests: {
        Row: {
          created_at: string
          delivery_address: string
          desired_at: string
          id: string
          local_spot_id: string
          order_summary: string
          owner_memo: string | null
          requester_name: string
          requester_phone: string
          requester_profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          desired_at: string
          id?: string
          local_spot_id: string
          order_summary: string
          owner_memo?: string | null
          requester_name: string
          requester_phone: string
          requester_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          desired_at?: string
          id?: string
          local_spot_id?: string
          order_summary?: string
          owner_memo?: string | null
          requester_name?: string
          requester_phone?: string
          requester_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_shop_delivery_requests_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      local_shop_guestbook_entries: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entry_kind: string
          id: string
          is_hidden: boolean
          local_spot_id: string
          owner_reply: string | null
          owner_reply_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entry_kind?: string
          id?: string
          is_hidden?: boolean
          local_spot_id: string
          owner_reply?: string | null
          owner_reply_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entry_kind?: string
          id?: string
          is_hidden?: boolean
          local_spot_id?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_shop_guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_shop_guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "local_shop_guestbook_entries_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      local_spot_announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_published: boolean
          kind: string
          local_spot_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_published?: boolean
          kind?: string
          local_spot_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          kind?: string
          local_spot_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_spot_announcements_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      local_spot_events: {
        Row: {
          body: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_published: boolean
          local_spot_id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          local_spot_id: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          local_spot_id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_spot_events_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      local_spot_menu_assets: {
        Row: {
          asset_type: string
          created_at: string
          error_message: string | null
          extracted_menu: Json
          id: string
          local_spot_id: string
          ocr_text: string | null
          pipeline_meta: Json
          processed_at: string | null
          public_url: string
          status: string
          storage_path: string
          style_profile: Json
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          error_message?: string | null
          extracted_menu?: Json
          id?: string
          local_spot_id: string
          ocr_text?: string | null
          pipeline_meta?: Json
          processed_at?: string | null
          public_url: string
          status?: string
          storage_path: string
          style_profile?: Json
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          error_message?: string | null
          extracted_menu?: Json
          id?: string
          local_spot_id?: string
          ocr_text?: string | null
          pipeline_meta?: Json
          processed_at?: string | null
          public_url?: string
          status?: string
          storage_path?: string
          style_profile?: Json
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_spot_menu_assets_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_menu_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_menu_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      local_spot_template_audits: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          draft_id: string | null
          id: string
          local_spot_id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          draft_id?: string | null
          id?: string
          local_spot_id: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          draft_id?: string | null
          id?: string
          local_spot_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "local_spot_template_audits_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_audits_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "local_spot_template_audits_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "local_spot_template_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_audits_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      local_spot_template_drafts: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          concept: Json
          confidence: number
          created_at: string
          created_by: string | null
          generation_notes: string | null
          id: string
          local_spot_id: string
          menu_items: Json
          minihome_template: Json
          pipeline_meta: Json
          pricing_table: Json
          published_at: string | null
          review_note: string | null
          review_notes: string | null
          reviewed_by: string | null
          snapshot_before: Json
          source_asset_ids: string[]
          source_image_urls: Json
          status: string
          strategy: Json
          style_profile_json: Json
          template_json: Json
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          concept?: Json
          confidence?: number
          created_at?: string
          created_by?: string | null
          generation_notes?: string | null
          id?: string
          local_spot_id: string
          menu_items?: Json
          minihome_template?: Json
          pipeline_meta?: Json
          pricing_table?: Json
          published_at?: string | null
          review_note?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          snapshot_before?: Json
          source_asset_ids?: string[]
          source_image_urls?: Json
          status?: string
          strategy?: Json
          style_profile_json?: Json
          template_json?: Json
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          concept?: Json
          confidence?: number
          created_at?: string
          created_by?: string | null
          generation_notes?: string | null
          id?: string
          local_spot_id?: string
          menu_items?: Json
          minihome_template?: Json
          pipeline_meta?: Json
          pricing_table?: Json
          published_at?: string | null
          review_note?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          snapshot_before?: Json
          source_asset_ids?: string[]
          source_image_urls?: Json
          status?: string
          strategy?: Json
          style_profile_json?: Json
          template_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_spot_template_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_local_spot_id_fkey"
            columns: ["local_spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spot_template_drafts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      local_spots: {
        Row: {
          address_normalized: string | null
          category: string
          created_at: string
          delivery_enabled: boolean
          delivery_radius_km: number | null
          description: string | null
          extra: Json
          id: string
          is_published: boolean
          lat: number | null
          line_url: string | null
          lng: number | null
          minihome_bgm_url: string | null
          minihome_extra: Json
          minihome_guestbook_enabled: boolean
          minihome_intro: string | null
          minihome_layout_modules: Json
          minihome_menu: Json
          minihome_public_slug: string | null
          minihome_theme: Json
          name: string
          owner_profile_id: string | null
          photo_urls: Json
          slug: string
          sort_order: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          address_normalized?: string | null
          category?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_radius_km?: number | null
          description?: string | null
          extra?: Json
          id?: string
          is_published?: boolean
          lat?: number | null
          line_url?: string | null
          lng?: number | null
          minihome_bgm_url?: string | null
          minihome_extra?: Json
          minihome_guestbook_enabled?: boolean
          minihome_intro?: string | null
          minihome_layout_modules?: Json
          minihome_menu?: Json
          minihome_public_slug?: string | null
          minihome_theme?: Json
          name: string
          owner_profile_id?: string | null
          photo_urls?: Json
          slug: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address_normalized?: string | null
          category?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_radius_km?: number | null
          description?: string | null
          extra?: Json
          id?: string
          is_published?: boolean
          lat?: number | null
          line_url?: string | null
          lng?: number | null
          minihome_bgm_url?: string | null
          minihome_extra?: Json
          minihome_guestbook_enabled?: boolean
          minihome_intro?: string | null
          minihome_layout_modules?: Json
          minihome_menu?: Json
          minihome_public_slug?: string | null
          minihome_theme?: Json
          name?: string
          owner_profile_id?: string | null
          photo_urls?: Json
          slug?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_spots_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_spots_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      minihome_diary_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          is_secret: boolean
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_secret?: boolean
          owner_id: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_secret?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_diary_entries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_minihomes"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      minihome_guestbook_entries: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entry_kind: string
          id: string
          is_hidden: boolean
          minihome_owner_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entry_kind?: string
          id?: string
          is_hidden?: boolean
          minihome_owner_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entry_kind?: string
          id?: string
          is_hidden?: boolean
          minihome_owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minihome_guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "minihome_guestbook_entries_minihome_owner_id_fkey"
            columns: ["minihome_owner_id"]
            isOneToOne: false
            referencedRelation: "user_minihomes"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      minihome_photo_albums: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_photo_albums_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_minihomes"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      minihome_photos: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "minihome_photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      minihome_rental_catalog: {
        Row: {
          active: boolean
          created_at: string
          item_key: string
          item_type: string
          label_ko: string
          label_th: string
          min_months: number
          monthly_cost_dotori: number
          payload: Json
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          item_key: string
          item_type: string
          label_ko: string
          label_th: string
          min_months?: number
          monthly_cost_dotori: number
          payload?: Json
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          item_key?: string
          item_type?: string
          label_ko?: string
          label_th?: string
          min_months?: number
          monthly_cost_dotori?: number
          payload?: Json
          sort_order?: number
        }
        Relationships: []
      }
      minihome_rentals: {
        Row: {
          applied_payload: Json
          auto_renew: boolean
          created_at: string
          ends_at: string
          id: string
          item_key: string
          monthly_cost_dotori: number
          months_rented: number
          profile_id: string
          renewal_count: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_payload?: Json
          auto_renew?: boolean
          created_at?: string
          ends_at: string
          id?: string
          item_key: string
          monthly_cost_dotori: number
          months_rented: number
          profile_id: string
          renewal_count?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_payload?: Json
          auto_renew?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          item_key?: string
          monthly_cost_dotori?: number
          months_rented?: number
          profile_id?: string
          renewal_count?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_rentals_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: false
            referencedRelation: "minihome_rental_catalog"
            referencedColumns: ["item_key"]
          },
          {
            foreignKeyName: "minihome_rentals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minihome_rentals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      minihome_visits: {
        Row: {
          created_at: string
          id: number
          minihome_owner_id: string
          visited_date: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          minihome_owner_id: string
          visited_date?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: never
          minihome_owner_id?: string
          visited_date?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "minihome_visits_minihome_owner_id_fkey"
            columns: ["minihome_owner_id"]
            isOneToOne: false
            referencedRelation: "user_minihomes"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "minihome_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minihome_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      news_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          processed_news_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          processed_news_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          processed_news_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "news_comments_processed_news_id_fkey"
            columns: ["processed_news_id"]
            isOneToOne: false
            referencedRelation: "processed_news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          created_at: string
          feed_url: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          feed_url: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          feed_url?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          is_read: boolean
          read_at: string | null
          source_id: string | null
          source_type: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          source_id?: string | null
          source_type?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          source_id?: string | null
          source_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          line_total_thb: number
          order_id: string
          quantity: number
          unit_price_thb: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total_thb: number
          order_id: string
          quantity: number
          unit_price_thb: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total_thb?: number
          order_id?: string
          quantity?: number
          unit_price_thb?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_intents: {
        Row: {
          amount_thb: number
          checkout_url: string | null
          created_at: string
          external_id: string | null
          id: string
          metadata: Json
          order_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_thb: number
          checkout_url?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          order_id: string
          provider: string
          status: string
          updated_at?: string
        }
        Update: {
          amount_thb?: number
          checkout_url?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contact_phone: string | null
          created_at: string
          currency: string
          customer_id: string
          delivery_address: string | null
          delivery_slot_id: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_provider: string | null
          payment_ref: string | null
          requested_delivery_at: string | null
          shop_id: string
          status: string
          total_amount_thb: number
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          delivery_address?: string | null
          delivery_slot_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          payment_provider?: string | null
          payment_ref?: string | null
          requested_delivery_at?: string | null
          shop_id: string
          status: string
          total_amount_thb: number
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_slot_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_provider?: string | null
          payment_ref?: string | null
          requested_delivery_at?: string | null
          shop_id?: string
          status?: string
          total_amount_thb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "orders_delivery_slot_id_fkey"
            columns: ["delivery_slot_id"]
            isOneToOne: false
            referencedRelation: "delivery_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          external_checkout_url: string | null
          external_payment_id: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          order_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          external_checkout_url?: string | null
          external_payment_id?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          order_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          external_checkout_url?: string | null
          external_payment_id?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          order_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          related_external_payment_id: string | null
          related_order_no: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          related_external_payment_id?: string | null
          related_order_no?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          related_external_payment_id?: string | null
          related_order_no?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json
          order_no: string
          profile_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          idempotency_key: string
          metadata?: Json
          order_no: string
          profile_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          order_no?: string
          profile_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      phone_otp_requests: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          phone_e164: string
          provider: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          phone_e164: string
          provider: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          phone_e164?: string
          provider?: string
        }
        Relationships: []
      }
      plazas: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_edit_secrets: {
        Row: {
          password_hash: string
          post_id: string
          updated_at: string
        }
        Insert: {
          password_hash: string
          post_id: string
          updated_at?: string
        }
        Update: {
          password_hash?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_edit_secrets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      posts: {
        Row: {
          author_hidden: boolean
          author_id: string
          category: string
          comment_count: number
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_urls: string[]
          is_anonymous: boolean
          is_knowledge_tip: boolean
          moderation_status: string
          owner_edit_password_set: boolean
          plaza_id: string | null
          severity: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_hidden?: boolean
          author_id: string
          category: string
          comment_count?: number
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_urls?: string[]
          is_anonymous?: boolean
          is_knowledge_tip?: boolean
          moderation_status?: string
          owner_edit_password_set?: boolean
          plaza_id?: string | null
          severity?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_hidden?: boolean
          author_id?: string
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_urls?: string[]
          is_anonymous?: boolean
          is_knowledge_tip?: boolean
          moderation_status?: string
          owner_edit_password_set?: boolean
          plaza_id?: string | null
          severity?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "posts_plaza_id_fkey"
            columns: ["plaza_id"]
            isOneToOne: false
            referencedRelation: "plazas"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_banners: {
        Row: {
          badge_text: string | null
          created_at: string
          ends_at: string | null
          extra: Json
          href: string | null
          id: string
          image_height: number | null
          image_url: string | null
          image_width: number | null
          is_active: boolean
          placement: string | null
          route_group: string
          slot: string
          sort_order: number
          sponsor_label: string | null
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          ends_at?: string | null
          extra?: Json
          href?: string | null
          id?: string
          image_height?: number | null
          image_url?: string | null
          image_width?: number | null
          is_active?: boolean
          placement?: string | null
          route_group?: string
          slot?: string
          sort_order?: number
          sponsor_label?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          ends_at?: string | null
          extra?: Json
          href?: string | null
          id?: string
          image_height?: number | null
          image_url?: string | null
          image_width?: number | null
          is_active?: boolean
          placement?: string | null
          route_group?: string
          slot?: string
          sort_order?: number
          sponsor_label?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      processed_knowledge: {
        Row: {
          board_target: string
          clean_body: Json | null
          created_at: string
          id: string
          language_default: string
          post_id: string | null
          published: boolean
          raw_knowledge_id: string
        }
        Insert: {
          board_target?: string
          clean_body?: Json | null
          created_at?: string
          id?: string
          language_default?: string
          post_id?: string | null
          published?: boolean
          raw_knowledge_id: string
        }
        Update: {
          board_target?: string
          clean_body?: Json | null
          created_at?: string
          id?: string
          language_default?: string
          post_id?: string | null
          published?: boolean
          raw_knowledge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_knowledge_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_knowledge_raw_knowledge_id_fkey"
            columns: ["raw_knowledge_id"]
            isOneToOne: false
            referencedRelation: "raw_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_news: {
        Row: {
          clean_body: string | null
          content_kr: string | null
          content_th: string | null
          created_at: string
          id: string
          language: string | null
          published: boolean
          raw_news_id: string
          title_kr: string | null
          title_th: string | null
        }
        Insert: {
          clean_body?: string | null
          content_kr?: string | null
          content_th?: string | null
          created_at?: string
          id?: string
          language?: string | null
          published?: boolean
          raw_news_id: string
          title_kr?: string | null
          title_th?: string | null
        }
        Update: {
          clean_body?: string | null
          content_kr?: string | null
          content_th?: string | null
          created_at?: string
          id?: string
          language?: string | null
          published?: boolean
          raw_news_id?: string
          title_kr?: string | null
          title_th?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_news_raw_news_id_fkey"
            columns: ["raw_news_id"]
            isOneToOne: false
            referencedRelation: "raw_news"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_style_unlocks: {
        Row: {
          equipped: boolean
          expires_at: string | null
          item_key: string
          profile_id: string
          purchased_at: string
        }
        Insert: {
          equipped?: boolean
          expires_at?: string | null
          item_key: string
          profile_id: string
          purchased_at?: string
        }
        Update: {
          equipped?: boolean
          expires_at?: string | null
          item_key?: string
          profile_id?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_style_unlocks_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: false
            referencedRelation: "style_shop_items"
            referencedColumns: ["item_key"]
          },
          {
            foreignKeyName: "profile_style_unlocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_style_unlocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_grade: number
          activity_grade_updated_at: string | null
          admin_search: string
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          created_at: string
          display_name: string | null
          dotori_balance: number
          id: string
          is_staff: boolean
          last_seen_at: string | null
          locale: string
          moderation_strikes: number
          quest_last_reward_at: string | null
          quest_risk_level: number
          signup_greeting_done: boolean
          style_score_total: number
          updated_at: string
        }
        Insert: {
          activity_grade?: number
          activity_grade_updated_at?: string | null
          admin_search?: string
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          created_at?: string
          display_name?: string | null
          dotori_balance?: number
          id: string
          is_staff?: boolean
          last_seen_at?: string | null
          locale?: string
          moderation_strikes?: number
          quest_last_reward_at?: string | null
          quest_risk_level?: number
          signup_greeting_done?: boolean
          style_score_total?: number
          updated_at?: string
        }
        Update: {
          activity_grade?: number
          activity_grade_updated_at?: string | null
          admin_search?: string
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          created_at?: string
          display_name?: string | null
          dotori_balance?: number
          id?: string
          is_staff?: boolean
          last_seen_at?: string | null
          locale?: string
          moderation_strikes?: number
          quest_last_reward_at?: string | null
          quest_risk_level?: number
          signup_greeting_done?: boolean
          style_score_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      publish_logs: {
        Row: {
          channel: string
          id: string
          meta: Json
          published_at: string
          target_id: string
          target_type: string
        }
        Insert: {
          channel?: string
          id?: string
          meta?: Json
          published_at?: string
          target_id: string
          target_type: string
        }
        Update: {
          channel?: string
          id?: string
          meta?: Json
          published_at?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_definitions: {
        Row: {
          active: boolean
          conditions: Json
          created_at: string
          description_ko: string | null
          description_th: string | null
          ends_at: string | null
          event_type: string
          goal_count: number
          id: string
          period_type: string
          quest_code: string
          reward_corn: number
          starts_at: string
          title_ko: string
          title_th: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conditions?: Json
          created_at?: string
          description_ko?: string | null
          description_th?: string | null
          ends_at?: string | null
          event_type: string
          goal_count?: number
          id?: string
          period_type: string
          quest_code: string
          reward_corn: number
          starts_at?: string
          title_ko: string
          title_th: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conditions?: Json
          created_at?: string
          description_ko?: string | null
          description_th?: string | null
          ends_at?: string | null
          event_type?: string
          goal_count?: number
          id?: string
          period_type?: string
          quest_code?: string
          reward_corn?: number
          starts_at?: string
          title_ko?: string
          title_th?: string
          updated_at?: string
        }
        Relationships: []
      }
      quest_instances: {
        Row: {
          cadence: string
          completed_at: string | null
          created_at: string
          definition_id: string
          description_ko: string
          description_th: string
          engagement_posted_at: string | null
          goal_count: number
          held_at: string | null
          hold_reason: string | null
          id: string
          metadata: Json
          metric_type: string
          period_end: string
          period_key: string
          period_start: string
          profile_id: string
          progress_count: number
          quest_code: string
          reward_corn: number
          reward_dotori: number
          rewarded_at: string | null
          status: string
          target_value: number
          template_id: string
          title_ko: string
          title_th: string
          updated_at: string
        }
        Insert: {
          cadence: string
          completed_at?: string | null
          created_at?: string
          definition_id: string
          description_ko: string
          description_th: string
          engagement_posted_at?: string | null
          goal_count: number
          held_at?: string | null
          hold_reason?: string | null
          id?: string
          metadata?: Json
          metric_type: string
          period_end: string
          period_key: string
          period_start: string
          profile_id: string
          progress_count?: number
          quest_code: string
          reward_corn: number
          reward_dotori: number
          rewarded_at?: string | null
          status?: string
          target_value: number
          template_id: string
          title_ko: string
          title_th: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          completed_at?: string | null
          created_at?: string
          definition_id?: string
          description_ko?: string
          description_th?: string
          engagement_posted_at?: string | null
          goal_count?: number
          held_at?: string | null
          hold_reason?: string | null
          id?: string
          metadata?: Json
          metric_type?: string
          period_end?: string
          period_key?: string
          period_start?: string
          profile_id?: string
          progress_count?: number
          quest_code?: string
          reward_corn?: number
          reward_dotori?: number
          rewarded_at?: string | null
          status?: string
          target_value?: number
          template_id?: string
          title_ko?: string
          title_th?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "quest_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_instances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_instances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "quest_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quest_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_progress_events: {
        Row: {
          amount: number
          dedupe_key: string | null
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          profile_id: string
          source: string
        }
        Insert: {
          amount?: number
          dedupe_key?: string | null
          event_type: string
          id?: never
          metadata?: Json
          occurred_at?: string
          profile_id: string
          source?: string
        }
        Update: {
          amount?: number
          dedupe_key?: string | null
          event_type?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          profile_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      quest_reward_holds: {
        Row: {
          created_at: string
          hold_reason: string
          id: number
          profile_id: string
          quest_instance_id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
        }
        Insert: {
          created_at?: string
          hold_reason: string
          id?: never
          profile_id: string
          quest_instance_id: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
        }
        Update: {
          created_at?: string
          hold_reason?: string
          id?: never
          profile_id?: string
          quest_instance_id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_reward_holds_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_reward_holds_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "quest_reward_holds_quest_instance_id_fkey"
            columns: ["quest_instance_id"]
            isOneToOne: true
            referencedRelation: "quest_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_reward_holds_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_reward_holds_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      quest_reward_ledger: {
        Row: {
          created_at: string
          id: number
          period_key: string
          profile_id: string
          quest_code: string
          quest_instance_id: string
          reason: string | null
          reward_corn: number
          reward_key: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          period_key: string
          profile_id: string
          quest_code: string
          quest_instance_id: string
          reason?: string | null
          reward_corn: number
          reward_key: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: never
          period_key?: string
          profile_id?: string
          quest_code?: string
          quest_instance_id?: string
          reason?: string | null
          reward_corn?: number
          reward_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_reward_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_reward_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "quest_reward_ledger_quest_instance_id_fkey"
            columns: ["quest_instance_id"]
            isOneToOne: true
            referencedRelation: "quest_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_templates: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          description_ko: string
          description_th: string
          id: string
          metric_type: string
          quest_key: string
          reward_dotori: number
          sort_order: number
          target_value: number
          title_ko: string
          title_th: string
        }
        Insert: {
          active?: boolean
          cadence: string
          created_at?: string
          description_ko: string
          description_th: string
          id?: string
          metric_type: string
          quest_key: string
          reward_dotori: number
          sort_order?: number
          target_value: number
          title_ko: string
          title_th: string
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          description_ko?: string
          description_th?: string
          id?: string
          metric_type?: string
          quest_key?: string
          reward_dotori?: number
          sort_order?: number
          target_value?: number
          title_ko?: string
          title_th?: string
        }
        Relationships: []
      }
      quest_user_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          metric_type: string
          profile_id: string
          quest_instance_id: string
          reward_claimed_at: string | null
          status: string
          target_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          metric_type: string
          profile_id: string
          quest_instance_id: string
          reward_claimed_at?: string | null
          status?: string
          target_value: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          metric_type?: string
          profile_id?: string
          quest_instance_id?: string
          reward_claimed_at?: string | null
          status?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_user_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_user_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "quest_user_progress_quest_instance_id_fkey"
            columns: ["quest_instance_id"]
            isOneToOne: false
            referencedRelation: "quest_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_knowledge: {
        Row: {
          content_hash: string | null
          external_url: string
          fetched_at: string
          id: string
          published_at: string | null
          raw_body: string | null
          source_id: string | null
          title_original: string | null
        }
        Insert: {
          content_hash?: string | null
          external_url: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          raw_body?: string | null
          source_id?: string | null
          title_original?: string | null
        }
        Update: {
          content_hash?: string | null
          external_url?: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          raw_body?: string | null
          source_id?: string | null
          title_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_knowledge_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_news: {
        Row: {
          external_url: string
          fetched_at: string
          id: string
          published_at: string | null
          raw_body: string | null
          source_id: string | null
          title: string
        }
        Insert: {
          external_url: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          raw_body?: string | null
          source_id?: string | null
          title: string
        }
        Update: {
          external_url?: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          raw_body?: string | null
          source_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_news_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      shop_announcements: {
        Row: {
          body: string
          business_id: string
          created_at: string
          ends_at: string | null
          id: string
          is_pinned: boolean
          kind: string
          starts_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_pinned?: boolean
          kind: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_pinned?: boolean
          kind?: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_announcements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "local_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_funnel_events: {
        Row: {
          actor_profile_id: string | null
          client_id: string | null
          created_at: string
          event_type: string
          id: number
          metadata: Json
          order_lead_id: string | null
          spot_id: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          metadata?: Json
          order_lead_id?: string | null
          spot_id?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          metadata?: Json
          order_lead_id?: string | null
          spot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_funnel_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_funnel_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "shop_funnel_events_order_lead_id_fkey"
            columns: ["order_lead_id"]
            isOneToOne: false
            referencedRelation: "shop_order_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_funnel_events_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_leads: {
        Row: {
          address_text: string
          confirmed_at: string | null
          created_at: string
          customer_name: string | null
          delivered_at: string | null
          delivery_fee_estimate: number | null
          delivery_status: string
          distance_km: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          menu_snapshot: Json
          notes: string | null
          phone: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_ready_at: string | null
          requested_time: string | null
          spot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address_text: string
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee_estimate?: number | null
          delivery_status?: string
          distance_km?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          menu_snapshot?: Json
          notes?: string | null
          phone: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_ready_at?: string | null
          requested_time?: string | null
          spot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_text?: string
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee_estimate?: number | null
          delivery_status?: string
          distance_km?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          menu_snapshot?: Json
          notes?: string | null
          phone?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_ready_at?: string | null
          requested_time?: string | null
          spot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_leads_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "local_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      site_copy: {
        Row: {
          key: string
          locale: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          locale?: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          locale?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      spline_scenes: {
        Row: {
          is_enabled: boolean
          placement_hint: string | null
          published_url: string | null
          quality_tier: string
          scene_code_url: string | null
          slot: string
          source_file_id: string | null
          updated_at: string
        }
        Insert: {
          is_enabled?: boolean
          placement_hint?: string | null
          published_url?: string | null
          quality_tier?: string
          scene_code_url?: string | null
          slot: string
          source_file_id?: string | null
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          placement_hint?: string | null
          published_url?: string | null
          quality_tier?: string
          scene_code_url?: string | null
          slot?: string
          source_file_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      style_shop_items: {
        Row: {
          active: boolean
          category: string
          item_key: string
          label_ko: string
          label_th: string
          min_activity_grade: number
          min_days_since_join: number
          payload: Json
          preview_url: string | null
          price_points: number
          rental_days: number | null
          rental_price: number | null
          sort_order: number
          source_type: string
          sponsor_name: string | null
          sponsor_region: string | null
          tier: string
        }
        Insert: {
          active?: boolean
          category: string
          item_key: string
          label_ko: string
          label_th: string
          min_activity_grade?: number
          min_days_since_join?: number
          payload?: Json
          preview_url?: string | null
          price_points: number
          rental_days?: number | null
          rental_price?: number | null
          sort_order?: number
          source_type?: string
          sponsor_name?: string | null
          sponsor_region?: string | null
          tier?: string
        }
        Update: {
          active?: boolean
          category?: string
          item_key?: string
          label_ko?: string
          label_th?: string
          min_activity_grade?: number
          min_days_since_join?: number
          payload?: Json
          preview_url?: string | null
          price_points?: number
          rental_days?: number | null
          rental_price?: number | null
          sort_order?: number
          source_type?: string
          sponsor_name?: string | null
          sponsor_region?: string | null
          tier?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          created_at: string
          id: string
          model: string | null
          processed_news_id: string
          summary_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          processed_news_id: string
          summary_text: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          processed_news_id?: string
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_processed_news_id_fkey"
            columns: ["processed_news_id"]
            isOneToOne: false
            referencedRelation: "processed_news"
            referencedColumns: ["id"]
          },
        ]
      }
      tips_articles: {
        Row: {
          body_preview: string | null
          content_kr: string | null
          content_th: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          processed_knowledge_id: string | null
          published_at: string | null
          source_post_id: string | null
          source_url: string | null
          status: string
          title: string
          title_kr: string | null
          title_th: string | null
          updated_at: string
        }
        Insert: {
          body_preview?: string | null
          content_kr?: string | null
          content_th?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          processed_knowledge_id?: string | null
          published_at?: string | null
          source_post_id?: string | null
          source_url?: string | null
          status?: string
          title: string
          title_kr?: string | null
          title_th?: string | null
          updated_at?: string
        }
        Update: {
          body_preview?: string | null
          content_kr?: string | null
          content_th?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          processed_knowledge_id?: string | null
          published_at?: string | null
          source_post_id?: string | null
          source_url?: string | null
          status?: string
          title?: string
          title_kr?: string | null
          title_th?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tips_articles_processed_knowledge_id_fkey"
            columns: ["processed_knowledge_id"]
            isOneToOne: true
            referencedRelation: "processed_knowledge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_articles_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_minihomes: {
        Row: {
          bgm_title: string | null
          bgm_url: string | null
          created_at: string
          intro_body: string | null
          is_public: boolean
          layout_modules: Json
          owner_id: string
          public_slug: string
          section_visibility: Json
          tagline: string | null
          theme: Json
          title: string | null
          updated_at: string
          visit_count_date: string
          visit_count_today: number
          visit_count_total: number
        }
        Insert: {
          bgm_title?: string | null
          bgm_url?: string | null
          created_at?: string
          intro_body?: string | null
          is_public?: boolean
          layout_modules?: Json
          owner_id: string
          public_slug: string
          section_visibility?: Json
          tagline?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
          visit_count_date?: string
          visit_count_today?: number
          visit_count_total?: number
        }
        Update: {
          bgm_title?: string | null
          bgm_url?: string | null
          created_at?: string
          intro_body?: string | null
          is_public?: boolean
          layout_modules?: Json
          owner_id?: string
          public_slug?: string
          section_visibility?: Json
          tagline?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
          visit_count_date?: string
          visit_count_today?: number
          visit_count_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_minihomes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_minihomes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_weekly_quest_claims: {
        Row: {
          created_at: string
          id: number
          profile_id: string
          quest_id: string
          reward_dotori: number
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: never
          profile_id: string
          quest_id: string
          reward_dotori: number
          week_start: string
        }
        Update: {
          created_at?: string
          id?: never
          profile_id?: string
          quest_id?: string
          reward_dotori?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weekly_quest_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_weekly_quest_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_weekly_quest_claims_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "weekly_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_weekly_quest_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: number
          profile_id: string
          progress_count: number
          quest_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: never
          profile_id: string
          progress_count?: number
          quest_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: never
          profile_id?: string
          progress_count?: number
          quest_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weekly_quest_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_weekly_quest_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_weekly_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "weekly_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      ux_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          locale: string
          meta: Json
          path: string
          session_id: string
          target_role: string | null
          target_text: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          locale?: string
          meta?: Json
          path: string
          session_id: string
          target_role?: string | null
          target_text?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          locale?: string
          meta?: Json
          path?: string
          session_id?: string
          target_role?: string | null
          target_text?: string | null
        }
        Relationships: []
      }
      ux_flag_overrides: {
        Row: {
          active: boolean
          flag_key: string
          flag_value: Json
          reason: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          flag_key: string
          flag_value?: Json
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          flag_key?: string
          flag_value?: Json
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ux_metrics_5m: {
        Row: {
          created_at: string
          totals: Json
          window_start: string
        }
        Insert: {
          created_at?: string
          totals?: Json
          window_start: string
        }
        Update: {
          created_at?: string
          totals?: Json
          window_start?: string
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          balance_minor: number
          created_at: string
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          balance_minor?: number
          created_at?: string
          currency: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          balance_minor?: number
          created_at?: string
          currency?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      wallet_ledger_entries: {
        Row: {
          amount_minor: number
          created_at: string
          direction: string
          id: string
          metadata: Json
          order_id: string | null
          reason: string
          reference_key: string
          wallet_account_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          direction: string
          id?: string
          metadata?: Json
          order_id?: string | null
          reason: string
          reference_key: string
          wallet_account_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          reason?: string
          reference_key?: string
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_entries_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          created_at: string
          id: string
          order_id: string
          topup_status: string
          updated_at: string
          wallet_account_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          topup_status?: string
          updated_at?: string
          wallet_account_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          topup_status?: string
          updated_at?: string
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_quests: {
        Row: {
          active: boolean
          code: string
          created_at: string
          event_type: string
          id: string
          reward_dotori: number
          sort_order: number
          target_count: number
          title_ko: string
          title_th: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          event_type: string
          id?: string
          reward_dotori?: number
          sort_order?: number
          target_count?: number
          title_ko: string
          title_th: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          event_type?: string
          id?: string
          reward_dotori?: number
          sort_order?: number
          target_count?: number
          title_ko?: string
          title_th?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_unlocks: {
        Row: {
          category: string | null
          days_remaining: number | null
          equipped: boolean | null
          expires_at: string | null
          item_key: string | null
          label_ko: string | null
          label_th: string | null
          payload: Json | null
          profile_id: string | null
          purchased_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_style_unlocks_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: false
            referencedRelation: "style_shop_items"
            referencedColumns: ["item_key"]
          },
          {
            foreignKeyName: "profile_style_unlocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_style_unlocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_admin_user_report_totals"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      v_admin_user_report_totals: {
        Row: {
          admin_search: string | null
          banned_until: string | null
          created_at: string | null
          display_name: string | null
          is_staff: boolean | null
          last_seen_at: string | null
          moderation_strikes: number | null
          profile_id: string | null
          reports_on_comments: number | null
          reports_on_posts: number | null
          reports_on_profile: number | null
          reports_total: number | null
        }
        Insert: {
          admin_search?: string | null
          banned_until?: string | null
          created_at?: string | null
          display_name?: string | null
          is_staff?: boolean | null
          last_seen_at?: string | null
          moderation_strikes?: number | null
          profile_id?: string | null
          reports_on_comments?: never
          reports_on_posts?: never
          reports_on_profile?: never
          reports_total?: never
        }
        Update: {
          admin_search?: string | null
          banned_until?: string | null
          created_at?: string | null
          display_name?: string | null
          is_staff?: boolean | null
          last_seen_at?: string | null
          moderation_strikes?: number | null
          profile_id?: string | null
          reports_on_comments?: never
          reports_on_posts?: never
          reports_on_profile?: never
          reports_total?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_user_directory_search: {
        Args: { p_limit?: number; p_query?: string; p_sort?: string }
        Returns: {
          admin_search: string | null
          banned_until: string | null
          created_at: string | null
          display_name: string | null
          is_staff: boolean | null
          last_seen_at: string | null
          moderation_strikes: number | null
          profile_id: string | null
          reports_on_comments: number | null
          reports_on_posts: number | null
          reports_on_profile: number | null
          reports_total: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_admin_user_report_totals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apply_dotori_ledger: {
        Args: {
          p_delta: number
          p_idempotency_key: string
          p_metadata?: Json
          p_profile_id: string
          p_reason: string
        }
        Returns: Json
      }
      dotori_daily_checkin: { Args: never; Returns: Json }
      dotori_expire_items: { Args: never; Returns: number }
      dotori_recalc_activity_grades: { Args: never; Returns: number }
      dotori_rent_minihome_item: {
        Args: { p_item_key: string; p_months?: number }
        Returns: Json
      }
      dotori_reward_activity: {
        Args: { p_amount: number; p_event_type: string; p_profile_id: string }
        Returns: Json
      }
      ensure_my_minihome: { Args: never; Returns: undefined }
      get_chat_preview: {
        Args: { limit_n?: number }
        Returns: {
          author_name: string
          body: string
          created_at: string
          id: string
        }[]
      }
      get_local_businesses_public: {
        Args: { limit_n?: number }
        Returns: {
          category: string
          description: string
          discount: string
          emoji: string
          has_discount: boolean
          id: string
          image_url: string
          is_recommended: boolean
          name: string
          region: string
          slug: string
          tags: string[]
          tier: string
        }[]
      }
      get_local_shop_guestbook_list: {
        Args: { p_limit?: number; p_local_spot_id: string }
        Returns: {
          author_id: string
          body: string
          created_at: string
          entry_kind: string
          id: string
          is_hidden: boolean
          owner_reply: string
          owner_reply_at: string
        }[]
      }
      get_popular_posts: {
        Args: { days_back?: number; limit_n?: number }
        Returns: {
          author_name: string
          category: string
          comment_count: number
          created_at: string
          id: string
          reaction_count: number
          title: string
          view_count: number
        }[]
      }
      get_tip_public: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          excerpt: string
          id: string
          title: string
        }[]
      }
      get_tips_public: {
        Args: { limit_n?: number }
        Returns: {
          created_at: string
          excerpt: string
          id: string
          title: string
        }[]
      }
      ilchon_accept_request: {
        Args: {
          p_acceptor_calls_requester: string
          p_request_id: string
          p_requester_calls_acceptor: string
        }
        Returns: undefined
      }
      ilchon_cancel_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      ilchon_reject_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      ilchon_search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          display_name: string
          is_ilchon: boolean
          last_seen_at: string
          pending_inbound: boolean
          pending_outbound: boolean
          public_slug: string
          user_id: string
        }[]
      }
      ilchon_send_dm: {
        Args: { p_body: string; p_to_user_id: string }
        Returns: string
      }
      ilchon_send_request: {
        Args: {
          p_message?: string
          p_proposed_nickname?: string
          p_to_user_id: string
        }
        Returns: string
      }
      ilchon_set_presence: {
        Args: { p_active_peer_id?: string; p_is_online?: boolean }
        Returns: undefined
      }
      minihome_record_visit: { Args: { p_owner_id: string }; Returns: Json }
      minihome_update_section_visibility: {
        Args: { p_section: string; p_visibility: string }
        Returns: Json
      }
      profile_compute_admin_search: { Args: { raw: string }; Returns: string }
      purge_shop_funnel_events: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      quest_apply_reward: {
        Args: { p_force?: boolean; p_instance_id: string }
        Returns: Json
      }
      quest_create_event_quest: {
        Args: {
          p_conditions?: Json
          p_ends_at?: string
          p_event_type: string
          p_goal_count?: number
          p_quest_code: string
          p_reward_corn?: number
          p_starts_at?: string
          p_title_ko: string
          p_title_th: string
        }
        Returns: string
      }
      quest_period_key: {
        Args: { p_period: string; p_target_date: string }
        Returns: string
      }
      quest_record_progress: {
        Args: {
          p_amount?: number
          p_dedupe_key?: string
          p_event_type: string
          p_metadata?: Json
          p_profile_id: string
          p_source?: string
        }
        Returns: Json
      }
      quest_settle_completed_rewards: {
        Args: { p_limit?: number }
        Returns: Json
      }
      quest_spawn_base_instances: {
        Args: { p_profile_id?: string; p_target_date?: string }
        Returns: number
      }
      style_complete_signup_greeting: {
        Args: { p_body: string }
        Returns: Json
      }
      style_equip_item: { Args: { p_item_key: string }; Returns: Json }
      style_purchase_item:
        | { Args: { p_item_key: string }; Returns: Json }
        | { Args: { p_item_key: string; p_rental?: boolean }; Returns: Json }
      touch_profile_last_seen: { Args: never; Returns: undefined }
      utf8_first_codepoint: { Args: { c: string }; Returns: number }
      weekly_quest_claim: { Args: { p_quest_id: string }; Returns: Json }
      weekly_quest_track_event: {
        Args: { p_event_type: string }
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
    Enums: {},
  },
} as const
