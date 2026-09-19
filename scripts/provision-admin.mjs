import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY wajib tersedia di .env.local");

const cfg = JSON.parse(readFileSync(new URL("../config/admin-auth-template.json", import.meta.url), "utf8"));
if (!cfg.email || !cfg.full_name) throw new Error("Email dan full_name admin wajib diisi pada config/admin-auth-template.json");

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const email = String(cfg.email).trim().toLowerCase();
const password = `RPL!${randomBytes(12).toString("base64url")}`;

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
let user = listed.users.find((u) => u.email?.toLowerCase() === email);
let status = "created";

if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(user.user_metadata || {}), full_name: cfg.full_name, role: "admin" }
  });
  if (error) throw error;
  user = data.user;
  status = "password_reset";
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: cfg.full_name, role: "admin" }
  });
  if (error || !data.user) throw error || new Error("Gagal membuat user admin");
  user = data.user;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  user_id: user.id,
  role: "admin",
  full_name: cfg.full_name,
  email,
  program_id: null,
  active: true
}, { onConflict: "user_id" });
if (profileError) throw profileError;

const csv = `email,temporary_password,status\n"${email}","${password}","${status}"\n`;
writeFileSync("admin-temp-credentials.csv", csv);
console.log("Akun ADMIN SuKaRPL selesai dibuat/reset.");
console.log("Login Admin memakai EMAIL + temporary_password.");
console.log("Buka file: admin-temp-credentials.csv");
