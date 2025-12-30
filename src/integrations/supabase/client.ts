import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbywgedbnfvdgfnybhkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieXdnZWRibmZ2ZGdmbnliaGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDQzNzQsImV4cCI6MjA4MjY4MDM3NH0.3cgriObESGpNaTmrSs2YWHapZan3ItBR3kal03dYkmg';

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: 'user' | 'admin';
        };
        Update: {
          role?: 'user' | 'admin';
        };
      };
      quizzes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          language: string;
          time_per_question: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          language?: string;
          time_per_question?: number;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          language?: string;
          time_per_question?: number;
          is_active?: boolean;
        };
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          title: string;
          incorrect_code: string;
          correct_code: string;
          expected_output: string | null;
          language: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          quiz_id: string;
          title?: string;
          incorrect_code: string;
          correct_code: string;
          expected_output?: string | null;
          language?: string;
          order_index?: number;
        };
        Update: {
          title?: string;
          incorrect_code?: string;
          correct_code?: string;
          expected_output?: string | null;
          language?: string;
          order_index?: number;
        };
      };
      quiz_assignments: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          is_completed: boolean;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          quiz_id: string;
          user_id: string;
          is_completed?: boolean;
          started_at?: string | null;
        };
        Update: {
          is_completed?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      question_orders: {
        Row: {
          id: string;
          assignment_id: string;
          question_id: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          assignment_id: string;
          question_id: string;
          order_index: number;
        };
        Update: {
          order_index?: number;
        };
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          question_id: string;
          user_code: string;
          is_correct: boolean;
          time_taken: number;
          submitted_at: string;
        };
        Insert: {
          assignment_id: string;
          question_id: string;
          user_code: string;
          is_correct?: boolean;
          time_taken?: number;
        };
        Update: {
          user_code?: string;
          is_correct?: boolean;
          time_taken?: number;
        };
      };
      cheat_logs: {
        Row: {
          id: string;
          user_id: string;
          assignment_id: string | null;
          event_type: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          assignment_id?: string | null;
          event_type: string;
          details?: string | null;
        };
        Update: {
          event_type?: string;
          details?: string | null;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Helper function to check if user is admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  return !!data;
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}
