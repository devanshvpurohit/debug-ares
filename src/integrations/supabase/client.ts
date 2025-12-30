import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbywgedbnfvdgfnybhkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieXdnZWRibmZ2ZGdmbnliaGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDQzNzQsImV4cCI6MjA4MjY4MDM3NH0.3cgriObESGpNaTmrSs2YWHapZan3ItBR3kal03dYkmg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
