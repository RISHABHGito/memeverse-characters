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
      character_aliases: {
        Row: {
          alias: string
          character_id: string
          created_at: string
          id: string
        }
        Insert: {
          alias: string
          character_id: string
          created_at?: string
          id?: string
        }
        Update: {
          alias?: string
          character_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_aliases_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_follows: {
        Row: {
          character_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_follows_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_tag_suggestions: {
        Row: {
          character_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["moderation_status"]
          suggested_by: string | null
          tag: string
          votes: number
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          suggested_by?: string | null
          tag: string
          votes?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          suggested_by?: string | null
          tag?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_tag_suggestions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string
          embedding: string | null
          follower_count: number
          id: string
          is_fictional: boolean
          meme_count: number
          name: string
          origin: string | null
          popularity: number
          search_text: string
          search_vector: unknown
          slug: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          follower_count?: number
          id?: string
          is_fictional?: boolean
          meme_count?: number
          name: string
          origin?: string | null
          popularity?: number
          search_text?: string
          search_vector?: unknown
          slug: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          follower_count?: number
          id?: string
          is_fictional?: boolean
          meme_count?: number
          name?: string
          origin?: string | null
          popularity?: number
          search_text?: string
          search_vector?: unknown
          slug?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      meme_interactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          meme_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          meme_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meme_interactions_meme_id_fkey"
            columns: ["meme_id"]
            isOneToOne: false
            referencedRelation: "memes"
            referencedColumns: ["id"]
          },
        ]
      }
      memes: {
        Row: {
          author_name: string | null
          character_id: string
          created_at: string
          description: string | null
          embedding: string | null
          external_id: string | null
          id: string
          like_count: number
          platform: Database["public"]["Enums"]["meme_platform"]
          save_count: number
          search_text: string
          search_vector: unknown
          source_url: string
          status: Database["public"]["Enums"]["moderation_status"]
          submitted_by: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_name?: string | null
          character_id: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          external_id?: string | null
          id?: string
          like_count?: number
          platform?: Database["public"]["Enums"]["meme_platform"]
          save_count?: number
          search_text?: string
          search_vector?: unknown
          source_url: string
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_name?: string | null
          character_id?: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          external_id?: string | null
          id?: string
          like_count?: number
          platform?: Database["public"]["Enums"]["meme_platform"]
          save_count?: number
          search_text?: string
          search_vector?: unknown
          source_url?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "memes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string | null
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
      increment_meme_view: { Args: { _meme_id: string }; Returns: undefined }
      recompute_popularity: { Args: never; Returns: undefined }
      refresh_character_search_text: {
        Args: { _character_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
      meme_platform: "youtube" | "instagram" | "x" | "other"
      moderation_status: "pending" | "approved" | "rejected"
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
      meme_platform: ["youtube", "instagram", "x", "other"],
      moderation_status: ["pending", "approved", "rejected"],
    },
  },
} as const
