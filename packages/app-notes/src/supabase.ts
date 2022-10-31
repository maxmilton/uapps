import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1/+esm';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);
