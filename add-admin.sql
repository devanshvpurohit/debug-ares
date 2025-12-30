-- =============================================
-- QUICK ADMIN SETUP FOR DEBUG ARENA
-- Run this in Supabase SQL Editor AFTER creating user
-- =============================================

-- Step 1: First create user in Supabase Dashboard:
--   Go to: Authentication > Users > Add User > Create New User
--   Email: admin@debugarena.com
--   Password: IARE@AIML

-- Step 2: Run this SQL to give them admin role:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'admin@debugarena.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify admin was created:
SELECT 
  u.email,
  u.created_at,
  r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE u.email = 'admin@debugarena.com';
