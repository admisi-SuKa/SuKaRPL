import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_SECRET_KEY belum dikonfigurasi.");
  return createSupabaseClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
