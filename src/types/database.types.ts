// Database type definitions aligned with the public schema in migrations 001-003.
// Regenerate from the applied Supabase project after each schema migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      busy_blocks: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          kind: 'class' | 'work' | 'meeting' | 'commute' | 'other'
          label: string | null
          source: 'import' | 'manual' | 'work' | 'commute' | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          kind?: 'class' | 'work' | 'meeting' | 'commute' | 'other'
          label?: string | null
          source?: 'import' | 'manual' | 'work' | 'commute' | null
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          kind?: 'class' | 'work' | 'meeting' | 'commute' | 'other'
          label?: string | null
          source?: 'import' | 'manual' | 'work' | 'commute' | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'busy_blocks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: 'pending' | 'accepted'
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: 'pending' | 'accepted'
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: 'pending' | 'accepted'
        }
        Relationships: [
          {
            foreignKeyName: 'friendships_addressee_id_fkey'
            columns: ['addressee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friendships_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      plan_invitees: {
        Row: {
          plan_id: string
          rsvp: 'pending' | 'going' | 'not_going'
          user_id: string
        }
        Insert: {
          plan_id: string
          rsvp?: 'pending' | 'going' | 'not_going'
          user_id: string
        }
        Update: {
          plan_id?: string
          rsvp?: 'pending' | 'going' | 'not_going'
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_participants_event_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      plans: {
        Row: {
          activity_id: string | null
          created_at: string
          end_at: string | null
          est_cost: string | null
          id: string
          invite_token: string
          leader_id: string
          notes: string | null
          place: string | null
          start_at: string
          suggestion_json: Json | null
          title: string
          transport: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          end_at?: string | null
          est_cost?: string | null
          id?: string
          invite_token?: string
          leader_id: string
          notes?: string | null
          place?: string | null
          start_at: string
          suggestion_json?: Json | null
          title: string
          transport?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          end_at?: string | null
          est_cost?: string | null
          id?: string
          invite_token?: string
          leader_id?: string
          notes?: string | null
          place?: string | null
          start_at?: string
          suggestion_json?: Json | null
          title?: string
          transport?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          commuter: boolean
          created_at: string
          default_energy: 'low' | 'medium' | 'high' | null
          display_name: string | null
          energy_date: string | null
          energy_level: 'chill' | 'social' | 'active' | null
          id: string
          interests: string[] | null
          town: string | null
        }
        Insert: {
          commuter?: boolean
          created_at?: string
          default_energy?: 'low' | 'medium' | 'high' | null
          display_name?: string | null
          energy_date?: string | null
          energy_level?: 'chill' | 'social' | 'active' | null
          id: string
          interests?: string[] | null
          town?: string | null
        }
        Update: {
          commuter?: boolean
          created_at?: string
          default_energy?: 'low' | 'medium' | 'high' | null
          display_name?: string | null
          energy_date?: string | null
          energy_level?: 'chill' | 'social' | 'active' | null
          id?: string
          interests?: string[] | null
          town?: string | null
        }
        Relationships: []
      }
      statuses: {
        Row: {
          activity: 'anything' | 'food' | 'active' | 'staying-in' | 'low-key'
          app_budget: 'free' | 'under15' | 'under30' | 'any'
          app_energy: 'chill' | 'social' | 'active'
          budget: 'free' | 'low' | 'medium' | 'high' | null
          created_at: string
          end_at: string
          energy: 'low' | 'medium' | 'high' | null
          id: string
          mode: 'now' | 'later'
          mood: 'down_for_anything' | 'staying_in' | 'low_budget' | 'specific' | null
          note: string | null
          start_at: string
          user_id: string
        }
        Insert: {
          activity?: 'anything' | 'food' | 'active' | 'staying-in' | 'low-key'
          app_budget?: 'free' | 'under15' | 'under30' | 'any'
          app_energy?: 'chill' | 'social' | 'active'
          budget?: 'free' | 'low' | 'medium' | 'high' | null
          created_at?: string
          end_at: string
          energy?: 'low' | 'medium' | 'high' | null
          id?: string
          mode?: 'now' | 'later'
          mood?: 'down_for_anything' | 'staying_in' | 'low_budget' | 'specific' | null
          note?: string | null
          start_at: string
          user_id: string
        }
        Update: {
          activity?: 'anything' | 'food' | 'active' | 'staying-in' | 'low-key'
          app_budget?: 'free' | 'under15' | 'under30' | 'any'
          app_energy?: 'chill' | 'social' | 'active'
          budget?: 'free' | 'low' | 'medium' | 'high' | null
          created_at?: string
          end_at?: string
          energy?: 'low' | 'medium' | 'high' | null
          id?: string
          mode?: 'now' | 'later'
          mood?: 'down_for_anything' | 'staying_in' | 'low_budget' | 'specific' | null
          note?: string | null
          start_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'statuses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_app_state: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          best_for: string | null
          category: string | null
          cost_max: number | null
          cost_min: number | null
          duration_min: number | null
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          address?: string | null
          best_for?: string | null
          category?: string | null
          cost_max?: number | null
          cost_min?: number | null
          duration_min?: number | null
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          address?: string | null
          best_for?: string | null
          category?: string | null
          cost_max?: number | null
          cost_min?: number | null
          duration_min?: number | null
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      enforce_sbu_access_token: { Args: { event: Json }; Returns: Json }
      get_friend_busy: {
        Args: { friend: string }
        Returns: { day_of_week: number; end_time: string; start_time: string }[]
      }
      get_plan_people: {
        Args: { plan_ids: string[] }
        Returns: { plan_id: string; user_id: string; display_name: string | null }[]
      }
      is_plan_member: { Args: { plan_uuid: string }; Returns: boolean }
      join_plan_by_token: { Args: { token: string }; Returns: string }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type Tables<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row']
