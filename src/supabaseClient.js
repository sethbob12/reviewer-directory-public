// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("Missing REACT_APP_SUPABASE_URL");
}
if (!SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error("Missing REACT_APP_SUPABASE_ANON_KEY");
} else {
  const looksLikeJwt = SUPABASE_ANON_KEY.startsWith("eyJ");
  // eslint-disable-next-line no-console
  console.log("Supabase key looks like JWT:", looksLikeJwt, "keyHead:", SUPABASE_ANON_KEY.slice(0, 12));
  if (!looksLikeJwt) {
    // eslint-disable-next-line no-console
    console.error(
      "Your REACT_APP_SUPABASE_ANON_KEY does not look like a legacy anon JWT. Use the Legacy anon key (starts with eyJ...)."
    );
  }
}

// Disable session persistence for a pure public app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});