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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          created_at: string
          date: string
          id: string
          time_slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          time_slot: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          time_slot?: string
          user_id?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          is_active: boolean
          joined_at: string
          paused: boolean
          paused_at: string | null
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          paused?: boolean
          paused_at?: string | null
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          paused?: boolean
          paused_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          item_index: number
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          item_index?: number
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          item_index?: number
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmed_hangouts: {
        Row: {
          activity: string
          created_at: string
          hangout_date: string
          id: string
          note: string | null
          request_id: string
          time_block: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          hangout_date: string
          id?: string
          note?: string | null
          request_id: string
          time_block: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          hangout_date?: string
          id?: string
          note?: string | null
          request_id?: string
          time_block?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmed_hangouts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "schedule_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      flare_recipients: {
        Row: {
          created_at: string
          flare_id: string
          id: string
          recipient_id: string
        }
        Insert: {
          created_at?: string
          flare_id: string
          id?: string
          recipient_id: string
        }
        Update: {
          created_at?: string
          flare_id?: string
          id?: string
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flare_recipients_flare_id_fkey"
            columns: ["flare_id"]
            isOneToOne: false
            referencedRelation: "flares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flare_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flare_responses: {
        Row: {
          created_at: string
          flare_id: string
          id: string
          message: string | null
          responder_id: string
        }
        Insert: {
          created_at?: string
          flare_id: string
          id?: string
          message?: string | null
          responder_id: string
        }
        Update: {
          created_at?: string
          flare_id?: string
          id?: string
          message?: string | null
          responder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flare_responses_flare_id_fkey"
            columns: ["flare_id"]
            isOneToOne: false
            referencedRelation: "flares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flare_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flares: {
        Row: {
          availability_type: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          message: string | null
          sender_id: string
        }
        Insert: {
          availability_type: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          message?: string | null
          sender_id: string
        }
        Update: {
          availability_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          message?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flares_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_hang_requests: {
        Row: {
          approver_id: string
          created_at: string
          hangout_id: string
          id: string
          requester_id: string
          status: string
          suggested_people: Json
          updated_at: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          hangout_id: string
          id?: string
          requester_id: string
          status?: string
          suggested_people?: Json
          updated_at?: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          hangout_id?: string
          id?: string
          requester_id?: string
          status?: string
          suggested_people?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          inviter_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          inviter_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          inviter_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          post_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          post_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          post_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_visibility: {
        Row: {
          created_at: string
          id: string
          post_id: string
          visibility_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          visibility_type: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_visibility_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_visibility_targets: {
        Row: {
          created_at: string
          id: string
          post_visibility_id: string
          village_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_visibility_id: string
          village_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_visibility_id?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_visibility_targets_post_visibility_id_fkey"
            columns: ["post_visibility_id"]
            isOneToOne: false
            referencedRelation: "post_visibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_visibility_targets_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_height: number | null
          image_width: number | null
          is_recommendation: boolean
          link_description: string | null
          link_image_url: string | null
          link_site_name: string | null
          link_title: string | null
          link_url: string | null
          prompt_type: string
          recommendation_category: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_height?: number | null
          image_width?: number | null
          is_recommendation?: boolean
          link_description?: string | null
          link_image_url?: string | null
          link_site_name?: string | null
          link_title?: string | null
          link_url?: string | null
          prompt_type?: string
          recommendation_category?: string | null
          session_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_height?: number | null
          image_width?: number | null
          is_recommendation?: boolean
          link_description?: string | null
          link_image_url?: string | null
          link_site_name?: string | null
          link_title?: string | null
          link_url?: string | null
          prompt_type?: string
          recommendation_category?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      priority_interests: {
        Row: {
          created_at: string
          id: string
          priority_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_interests_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "weekly_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          discoverable: boolean | null
          display_name: string
          gender: string | null
          id: string
          is_team_account: boolean | null
          last_nudge: string | null
          location_type: string | null
          notify_comments: boolean | null
          notify_flare_alerts: boolean | null
          notify_hangout_invites: boolean | null
          notify_monthly_paper: boolean | null
          onboarding_step: string | null
          phone_hash: string | null
          referral_source: string | null
          scheduling_requests_remaining: number
          social_media_usage: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          username: string | null
          weekly_flow_completed_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string
          gender?: string | null
          id?: string
          is_team_account?: boolean | null
          last_nudge?: string | null
          location_type?: string | null
          notify_comments?: boolean | null
          notify_flare_alerts?: boolean | null
          notify_hangout_invites?: boolean | null
          notify_monthly_paper?: boolean | null
          onboarding_step?: string | null
          phone_hash?: string | null
          referral_source?: string | null
          scheduling_requests_remaining?: number
          social_media_usage?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          weekly_flow_completed_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string
          gender?: string | null
          id?: string
          is_team_account?: boolean | null
          last_nudge?: string | null
          location_type?: string | null
          notify_comments?: boolean | null
          notify_flare_alerts?: boolean | null
          notify_hangout_invites?: boolean | null
          notify_monthly_paper?: boolean | null
          onboarding_step?: string | null
          phone_hash?: string | null
          referral_source?: string | null
          scheduling_requests_remaining?: number
          social_media_usage?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          weekly_flow_completed_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      schedule_requests: {
        Row: {
          activity: string | null
          created_at: string
          decline_note: string | null
          id: string
          note: string | null
          proposed_date: string
          proposed_time_slot: string
          recipient_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activity?: string | null
          created_at?: string
          decline_note?: string | null
          id?: string
          note?: string | null
          proposed_date: string
          proposed_time_slot: string
          recipient_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity?: string | null
          created_at?: string
          decline_note?: string | null
          id?: string
          note?: string | null
          proposed_date?: string
          proposed_time_slot?: string
          recipient_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sunday_papers: {
        Row: {
          created_at: string
          dismissed: boolean
          id: string
          image_of_week_post_id: string | null
          image_of_week_url: string | null
          moment_of_week_data: Json | null
          moment_of_week_post_id: string | null
          nudge: string
          top_poster_count: number | null
          top_poster_name: string | null
          user_id: string
          village_roundup: Json
          week_end: string
          week_start: string
          your_week: Json | null
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          id?: string
          image_of_week_post_id?: string | null
          image_of_week_url?: string | null
          moment_of_week_data?: Json | null
          moment_of_week_post_id?: string | null
          nudge: string
          top_poster_count?: number | null
          top_poster_name?: string | null
          user_id: string
          village_roundup?: Json
          week_end: string
          week_start: string
          your_week?: Json | null
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          id?: string
          image_of_week_post_id?: string | null
          image_of_week_url?: string | null
          moment_of_week_data?: Json | null
          moment_of_week_post_id?: string | null
          nudge?: string
          top_poster_count?: number | null
          top_poster_name?: string | null
          user_id?: string
          village_roundup?: Json
          week_end?: string
          week_start?: string
          your_week?: Json | null
        }
        Relationships: []
      }
      village_members: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          village_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          village_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_members_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "village_members_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      village_monthly_editions: {
        Row: {
          circle_id: string
          created_at: string
          edition_month: string
          id: string
          published_at: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          edition_month: string
          id?: string
          published_at?: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          edition_month?: string
          id?: string
          published_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_monthly_editions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      village_monthly_views: {
        Row: {
          edition_id: string
          first_seen_at: string
          id: string
          user_id: string
        }
        Insert: {
          edition_id: string
          first_seen_at?: string
          id?: string
          user_id: string
        }
        Update: {
          edition_id?: string
          first_seen_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_monthly_views_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "village_monthly_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "village_monthly_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_friend_priorities: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_priorities: {
        Row: {
          activity: string
          category: string
          completed: boolean
          created_at: string
          id: string
          user_id: string
          week_start: string
        }
        Insert: {
          activity: string
          category: string
          completed?: boolean
          created_at?: string
          id?: string
          user_id: string
          week_start: string
        }
        Update: {
          activity?: string
          category?: string
          completed?: boolean
          created_at?: string
          id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_circle_member: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_circle_owner: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_flare_active: { Args: { _flare_id: string }; Returns: boolean }
      is_flare_recipient: {
        Args: { _flare_id: string; _user_id: string }
        Returns: boolean
      }
      is_flare_sender: {
        Args: { _flare_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_profile: {
        Args: { _profile_id: string; _user_id: string }
        Returns: boolean
      }
      is_visible_to_viewer: {
        Args: {
          _content_created_at: string
          _poster_id: string
          _viewer_id: string
        }
        Returns: boolean
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
