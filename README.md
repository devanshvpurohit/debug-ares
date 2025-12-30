# 🟢 DEBUG ARENA - MATRIX EDITION

An immersive, multi-language code debugging platform built with React, Vite, Supabase, and a futuristic Matrix-inspired aesthetic.

## 🌌 Features

- **Matrix Aesthetics**: Immersive green-on-black UI with falling digital rain animations, cyber-borders, and scanline effects.
- **Enhanced Admin IDE**: A professional-grade online IDE (powered by Monaco Editor) for creating and managing debugging challenges.
- **Multi-Language Support**: Debug challenges in JavaScript, Python, Java, C++, Go, C#, and Ruby.
- **Anti-Cheat System**: Real-time detection of tab switching and clipboard usage to ensure fair play.
- **Real-time Leaderboard**: Track ranks and performance in a neon-glow podium environment.
- **Supabase Powered**: Robust authentication and real-time database integration.

## 🛠️ Quick Start

```sh
# Clone the repository
git clone https://github.com/devanshvpurohit/debug-ares.git

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔐 Supabase Configuration

To get the platform fully operational, you need to set up your Supabase project:

1. **Database Schema**:
   - Run the contents of `supabase-schema.sql` in your Supabase SQL Editor.
   
2. **Admin Setup**:
   - Sign up through the application with your desired admin email.
   - Run the following SQL to grant admin privileges:
     ```sql
     INSERT INTO public.user_roles (user_id, role)
     SELECT id, 'admin' FROM auth.users WHERE email = 'YOUR_EMAIL';
     ```

## 🚀 Technologies

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Custom Matrix CSS
- **IDE Engine**: Monaco Editor
- **Backend**: Supabase (Auth, PostgreSQL, RLS)
- **UI Components**: Shadcn UI

---

*</> DEBUG ARENA v2.0 | MATRIX EDITION </>*
