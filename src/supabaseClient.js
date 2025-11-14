import { createClient } from "@supabase/supabase-js";

const url  = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing Supabase env vars. Check .env.local and restart npm start.", {
    urlPresent: !!url, anonPresent: !!anon
  });
}

// Safe fallback client to avoid “Cannot read properties of undefined ('from')”
export const supabase = (url && anon)
  ? createClient(url, anon, { auth: { persistSession: false } })
  : { from() { throw new Error("Supabase not initialized (missing env vars)."); } };
