export type AppRole = 'admin' | 'user';

export type ProgrammingLanguage = 'java' | 'python' | 'cpp' | 'javascript' | 'go' | 'csharp' | 'ruby';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  language: ProgrammingLanguage;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  title: string;
  incorrect_code: string;
  correct_code: string;
  expected_output: string;
  language: ProgrammingLanguage;
  order_index: number;
  created_at: string;
}

export interface QuizAssignment {
  id: string;
  quiz_id: string;
  user_id: string;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface QuestionOrder {
  id: string;
  assignment_id: string;
  question_id: string;
  order_index: number;
}

export interface Submission {
  id: string;
  assignment_id: string;
  question_id: string;
  user_code: string;
  is_correct: boolean;
  time_taken: number;
  submitted_at: string;
}

export interface CheatLog {
  id: string;
  user_id: string;
  assignment_id: string;
  event_type: string;
  details: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Profile>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id'> & { id?: string };
        Update: Partial<UserRole>;
      };
      quizzes: {
        Row: Quiz;
        Insert: Omit<Quiz, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { 
          id?: string; 
          created_at?: string; 
          updated_at?: string;
          is_active?: boolean;
        };
        Update: Partial<Quiz>;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at' | 'order_index'> & { 
          id?: string; 
          created_at?: string;
          order_index?: number;
        };
        Update: Partial<Question>;
      };
      quiz_assignments: {
        Row: QuizAssignment;
        Insert: Omit<QuizAssignment, 'id' | 'created_at' | 'is_completed' | 'started_at' | 'completed_at'> & { 
          id?: string; 
          created_at?: string;
          is_completed?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<QuizAssignment>;
      };
      question_orders: {
        Row: QuestionOrder;
        Insert: Omit<QuestionOrder, 'id'> & { id?: string };
        Update: Partial<QuestionOrder>;
      };
      submissions: {
        Row: Submission;
        Insert: Omit<Submission, 'id' | 'submitted_at' | 'is_correct'> & { 
          id?: string; 
          submitted_at?: string;
          is_correct?: boolean;
        };
        Update: Partial<Submission>;
      };
      cheat_logs: {
        Row: CheatLog;
        Insert: Omit<CheatLog, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<CheatLog>;
      };
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
    };
  };
}
