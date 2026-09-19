import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY wajib tersedia di .env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = "DemoRPL!2026";

async function getOrCreateUser(email, fullName, role) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    });
    if (error) throw error;
    user = data.user;
  }
  return user;
}

async function main() {
  const { data: program, error: pErr } = await supabase.from("programs").upsert({
    code: "S2-DEMO",
    name: "Program Studi Magister (Demo)",
    degree: "Magister",
    active: true
  }, { onConflict: "code" }).select().single();
  if (pErr) throw pErr;

  await supabase.from("program_settings").upsert({
    program_id: program.id,
    head_name: "Dr. Ketua Program Studi",
    head_nip: "198001012010011001"
  });

  const accounts = [
    ["mahasiswa@sukarpl.local", "Mahasiswa Demo", "participant"],
    ["prodi@sukarpl.local", "Admin Program Studi", "prodi"],
    ["asesor1@sukarpl.local", "Dr. Asesor Satu", "assessor"],
    ["asesor2@sukarpl.local", "Dr. Asesor Dua", "assessor"]
  ];

  const users = {};
  for (const [email, name, role] of accounts) {
    users[role === "assessor" ? email : role] = await getOrCreateUser(email, name, role);
  }

  async function upsertProfile(user, role, fullName) {
    const { data, error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      role,
      full_name: fullName,
      email: user.email,
      program_id: program.id,
      active: true
    }, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return data;
  }

  const participantProfile = await upsertProfile(users.participant, "participant", "Mahasiswa Demo");
  await upsertProfile(users.prodi, "prodi", "Admin Program Studi");
  const assessor1Profile = await upsertProfile(users["asesor1@sukarpl.local"], "assessor", "Dr. Asesor Satu");
  const assessor2Profile = await upsertProfile(users["asesor2@sukarpl.local"], "assessor", "Dr. Asesor Dua");

  const { data: participant, error: partErr } = await supabase.from("participants").upsert({
    profile_id: participantProfile.id,
    program_id: program.id,
    participant_no: "RPL20260001",
    registration_no: "REG20260001",
    full_name: "Mahasiswa Demo",
    birth_place: "Yogyakarta",
    birth_date: "1995-05-20",
    gender: "L",
    email: "mahasiswa@sukarpl.local",
    phone: "081234567890",
    education_level: "Sarjana",
    previous_institution: "Universitas Contoh",
    previous_program: "Manajemen",
    graduation_year: 2018
  }, { onConflict: "profile_id" }).select().single();
  if (partErr) throw partErr;

  async function upsertAssessor(profile, nip, name, email) {
    const { data, error } = await supabase.from("assessors").upsert({
      profile_id: profile.id,
      program_id: program.id,
      nip,
      full_name: name,
      email,
      active: true
    }, { onConflict: "profile_id" }).select().single();
    if (error) throw error;
    return data;
  }

  const assessor1 = await upsertAssessor(assessor1Profile, "198101012010011001", "Dr. Asesor Satu", "asesor1@sukarpl.local");
  const assessor2 = await upsertAssessor(assessor2Profile, "198202022011012002", "Dr. Asesor Dua", "asesor2@sukarpl.local");

  const coursesSeed = [
    ["RPL601", "Analisis Data", 3, "OBE"],
    ["RPL602", "Manajemen Strategis", 3, "OBE"],
    ["RPL603", "Metodologi Penelitian", 3, "OBE"],
    ["RPL604", "Transformasi Digital", 2, "NON_OBE"]
  ];
  const courseMap = {};
  for (const [code, name, credits, assessment_type] of coursesSeed) {
    const { data, error } = await supabase.from("courses").upsert({
      program_id: program.id, code, name, credits, assessment_type, active: true
    }, { onConflict: "program_id,code" }).select().single();
    if (error) throw error;
    courseMap[code] = data;
  }

  const cpmkSeed = [
    ["RPL601", "CPMK-1", 1, "Mampu mengolah dan memvalidasi data secara sistematis."],
    ["RPL601", "CPMK-2", 2, "Mampu menginterpretasikan hasil analisis untuk pengambilan keputusan."],
    ["RPL602", "CPMK-1", 1, "Mampu menganalisis isu strategis organisasi."],
    ["RPL602", "CPMK-2", 2, "Mampu merumuskan alternatif strategi berbasis bukti."],
    ["RPL603", "CPMK-1", 1, "Mampu merancang penelitian yang relevan dan dapat dipertanggungjawabkan."],
    ["RPL603", "CPMK-2", 2, "Mampu menentukan metode pengumpulan dan analisis data yang sesuai."]
  ];
  for (const [courseCode, code, sort_order, description] of cpmkSeed) {
    const { error } = await supabase.from("cpmks").upsert({
      course_id: courseMap[courseCode].id, code, sort_order, description, active: true
    }, { onConflict: "course_id,code" });
    if (error) throw error;
  }

  let { data: application } = await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle();
  if (!application) {
    const { data, error } = await supabase.from("applications").insert({ participant_id: participant.id, program_id: program.id, status: "DRAFT" }).select().single();
    if (error) throw error;
    application = data;
  }

  const claimIds = [];
  const claimMap = {};
  for (const code of ["RPL601", "RPL604"]) {
    const { data, error } = await supabase.from("course_claims").upsert({
      application_id: application.id,
      course_id: courseMap[code].id
    }, { onConflict: "application_id,course_id" }).select().single();
    if (error) throw error;
    claimIds.push(data.id);
    claimMap[code] = data.id;
  }

  const { data: demoCpmks, error: demoCpmkError } = await supabase.from("cpmks").select("id,course_id").eq("course_id", courseMap.RPL601.id).eq("active", true);
  if (demoCpmkError) throw demoCpmkError;
  for (const cp of demoCpmks || []) {
    const { error } = await supabase.from("course_claim_cpmks").upsert({ course_claim_id: claimMap.RPL601, cpmk_id: cp.id }, { onConflict: "course_claim_id,cpmk_id" });
    if (error) throw error;
  }

  let { data: evidence } = await supabase.from("evidences").select("*").eq("application_id", application.id).eq("title", "Sertifikat Pelatihan Data Analytics").maybeSingle();
  if (!evidence) {
    const { data, error } = await supabase.from("evidences").insert({
      application_id: application.id,
      evidence_type_id: "sertifikat_pelatihan",
      title: "Sertifikat Pelatihan Data Analytics",
      url: "https://example.com/bukti-demo",
      description: "Contoh evidence URL yang dapat digunakan untuk lebih dari satu mata kuliah."
    }).select().single();
    if (error) throw error;
    evidence = data;
  }
  for (const claimId of claimIds) {
    await supabase.from("claim_evidences").upsert({ course_claim_id: claimId, evidence_id: evidence.id });
  }

  await supabase.from("assessor_assignments").upsert({
    application_id: application.id,
    assessor1_id: assessor1.id,
    assessor2_id: assessor2.id
  }, { onConflict: "application_id" });

  console.log("\nSeed demo SuKaRPL selesai.\n");
  console.log(`Password semua akun: ${PASSWORD}`);
  console.log("Mahasiswa: mahasiswa@sukarpl.local");
  console.log("Prodi     : prodi@sukarpl.local");
  console.log("Asesor 1  : asesor1@sukarpl.local");
  console.log("Asesor 2  : asesor2@sukarpl.local\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
