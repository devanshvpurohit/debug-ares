-- =============================================
-- DEBUG ARENA - COMPLETE SUPABASE DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- 2. USER_ROLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 3. QUIZZES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'javascript',
  time_per_question INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active quizzes" ON public.quizzes;
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage quizzes" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 4. QUESTIONS TABLE (Updated schema)
-- =============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Fix the bug',
  incorrect_code TEXT NOT NULL,
  correct_code TEXT NOT NULL,
  expected_output TEXT,
  language TEXT NOT NULL DEFAULT 'javascript',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view questions for assigned quizzes" ON public.questions;
CREATE POLICY "Users can view questions for assigned quizzes" ON public.questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.quiz_id = questions.quiz_id AND qa.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 5. QUIZ_ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignments" ON public.quiz_assignments;
CREATE POLICY "Users can view own assignments" ON public.quiz_assignments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assignments" ON public.quiz_assignments;
CREATE POLICY "Users can update own assignments" ON public.quiz_assignments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.quiz_assignments;
CREATE POLICY "Admins can manage assignments" ON public.quiz_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 6. QUESTION_ORDERS TABLE (for randomized order per user)
-- =============================================
CREATE TABLE IF NOT EXISTS public.question_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, question_id)
);

ALTER TABLE public.question_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own question orders" ON public.question_orders;
CREATE POLICY "Users can view own question orders" ON public.question_orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.id = question_orders.assignment_id AND qa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own question orders" ON public.question_orders;
CREATE POLICY "Users can insert own question orders" ON public.question_orders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.id = question_orders.assignment_id AND qa.user_id = auth.uid()
  )
);

-- =============================================
-- 7. SUBMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_code TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  time_taken INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, question_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;
CREATE POLICY "Users can view own submissions" ON public.submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.id = submissions.assignment_id AND qa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own submissions" ON public.submissions;
CREATE POLICY "Users can insert own submissions" ON public.submissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.id = submissions.assignment_id AND qa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
CREATE POLICY "Admins can view all submissions" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 8. CHEAT_LOGS TABLE (Anti-cheat logging)
-- =============================================
CREATE TABLE IF NOT EXISTS public.cheat_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cheat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own cheat logs" ON public.cheat_logs;
CREATE POLICY "Users can insert own cheat logs" ON public.cheat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all cheat logs" ON public.cheat_logs;
CREATE POLICY "Admins can view all cheat logs" ON public.cheat_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 9. FUNCTION: Handle new user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 10. CREATE ADMIN USER
-- Run this AFTER signing up with the email admin@debugarena.com
-- =============================================
-- First, sign up through the app with:
--   Email: admin@debugarena.com  
--   Password: IARE@AIML
--   Name: ADMIN
--
-- Then run this to make them admin:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'admin@debugarena.com';

-- =============================================
-- END OF SCHEMA
-- =============================================
