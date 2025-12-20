export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
          user_id: string
        }
        Insert: {
          id?: number
          name: string
          user_id?: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
        }
      }
      subcategories: {
        Row: {
          id: number
          category_id: number
          name: string
          display_order: number
          user_id: string
        }
        Insert: {
          id?: number
          category_id: number
          name: string
          display_order: number
          user_id?: string
        }
        Update: {
          id?: number
          category_id?: number
          name?: string
          display_order?: number
          user_id?: string
        }
      }
      transactions: {
        Row: {
          id: number
          user_id: string
          local_id: string
          occurred_at: string
          amount: number
          subcategory_id: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          local_id: string
          occurred_at: string
          amount: number
          subcategory_id: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          local_id?: string
          occurred_at?: string
          amount?: number
          subcategory_id?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      months: {
        Row: {
          id: number
          year: number
          month: number
          label: string | null
          user_id: string
        }
        Insert: {
          id?: number
          year: number
          month: number
          label?: string | null
          user_id?: string
        }
        Update: {
          id?: number
          year?: number
          month?: number
          label?: string | null
          user_id?: string
        }
      }
      entries: {
        Row: {
          id: number
          month_id: number
          subcategory_id: number
          amount: number
          user_id: string
        }
        Insert: {
          id?: number
          month_id: number
          subcategory_id: number
          amount: number
          user_id?: string
        }
        Update: {
          id?: number
          month_id?: number
          subcategory_id?: number
          amount?: number
          user_id?: string
        }
      }
      month_subcategory_visibility: {
        Row: {
          id: number
          month_id: number
          subcategory_id: number
          is_visible: boolean
          created_at: string | null
          user_id: string
        }
        Insert: {
          id?: number
          month_id: number
          subcategory_id: number
          is_visible?: boolean
          created_at?: string | null
          user_id?: string
        }
        Update: {
          id?: number
          month_id?: number
          subcategory_id?: number
          is_visible?: boolean
          created_at?: string | null
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
