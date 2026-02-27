// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Fail fast without console noise.
// CRA will surface thrown errors in the overlay during dev,
// and your build/deploy should fail loudly if env vars are missing.
if (!SUPABASE_URL) {
  throw new Error("Missing REACT_APP_SUPABASE_URL");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing REACT_APP_SUPABASE_ANON_KEY");
}

// Disable session persistence for a pure public app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});