import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function wrapText(text: string, max = 72) {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id,status,finalized_at,program_id,program:programs(name,degree),participant:participants(participant_no,full_name,birth_place,birth_date,education_level,previous_institution,previous_program,graduation_year)").eq("id", id).maybeSingle();
  if (!app) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  if (app.status !== "FINAL") return NextResponse.json({ error: "Yudisium belum final." }, { status: 409 });

  const [{ data: decisions }, { data: assignment }, { data: settings }, { data: scores }] = await Promise.all([
    supabase.from("yudisium_decisions").select("result,course_claim_id,course_claim:course_claims(course:courses(code,name,credits))").eq("application_id", id).eq("status", "FINAL"),
    supabase.from("assessor_assignments").select("assessor1_id,assessor2_id,assessor1:assessors!assessor_assignments_assessor1_id_fkey(full_name,nip),assessor2:assessors!assessor_assignments_assessor2_id_fkey(full_name,nip)").eq("application_id", id).maybeSingle(),
    supabase.from("program_settings").select("head_name,head_nip").eq("program_id", app.program_id).maybeSingle(),
    supabase.from("assessor_scores").select("assessor_id,course_claim_id,score").eq("application_id", id)
  ]);

  const participant: any = app.participant;
  const program: any = app.program;
  const totalSks = (decisions || []).reduce((sum, row: any) => sum + (row.result === "YA" ? Number(row.course_claim?.course?.credits || 0) : 0), 0);
  const assessorIds = [assignment?.assessor1_id, assignment?.assessor2_id].filter(Boolean) as string[];

  function recognitionScore(claimId: string) {
    const assessorMeans = assessorIds.map((assessorId) => average((scores || [])
      .filter((row: any) => row.assessor_id === assessorId && row.course_claim_id === claimId && row.score !== null)
      .map((row: any) => Number(row.score))
    )).filter((value): value is number => value !== null);
    return assessorMeans.length === 2 ? average(assessorMeans) : null;
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Berita Acara RPL - ${participant?.full_name || "Peserta"}`);
  pdf.setAuthor("SuKaRPL - UIN Sunan Kalijaga");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = 795;
  const left = 52;
  const green = rgb(0.03, 0.36, 0.32);
  const orange = rgb(0.97, 0.45, 0.08);
  const dark = rgb(0.10, 0.15, 0.13);
  const gray = rgb(0.39, 0.47, 0.44);

  const addPageIfNeeded = (needed = 45) => {
    if (y < needed + 45) { page = pdf.addPage(pageSize); y = 790; }
  };
  const text = (value: string, size = 10, font = regular, color = dark, x = left) => { page.drawText(value, { x, y, size, font, color }); y -= size + 6; };
  const paragraph = (value: string, size = 10, max = 86) => { for (const line of wrapText(value, max)) { addPageIfNeeded(); text(line, size); } };

  page.drawRectangle({ x: left, y: 770, width: 491, height: 4, color: green });
  page.drawRectangle({ x: left + 395, y: 770, width: 96, height: 4, color: orange });
  text("UNIVERSITAS ISLAM NEGERI SUNAN KALIJAGA YOGYAKARTA", 11, bold, green);
  text("BERITA ACARA HASIL ASESMEN REKOGNISI PEMBELAJARAN LAMPAU", 14, bold, dark);
  text("SuKaRPL", 9, bold, orange);
  y -= 8;

  const details = [
    ["Nama Peserta", participant?.full_name || "-"],
    ["Nomor Peserta", participant?.participant_no || "-"],
    ["Program Studi", program?.name || profile.program?.name || "-"],
    ["Jenjang", program?.degree || "Magister"],
    ["Tempat/Tanggal Lahir", `${participant?.birth_place || "-"} / ${participant?.birth_date || "-"}`],
    ["Pendidikan Terakhir", participant?.education_level || "-"],
    ["Perguruan Tinggi Asal", participant?.previous_institution || "-"],
    ["Program Studi Asal", participant?.previous_program || "-"],
    ["Tahun Lulus", participant?.graduation_year ? String(participant.graduation_year) : "-"]
  ];
  for (const [label, value] of details) {
    addPageIfNeeded();
    page.drawText(label, { x: left, y, size: 9, font: bold, color: gray });
    page.drawText(":", { x: 178, y, size: 9, font: bold, color: gray });
    page.drawText(String(value).slice(0, 65), { x: 190, y, size: 9, font: regular, color: dark });
    y -= 16;
  }
  y -= 10;
  text("HASIL REKOGNISI", 11, bold, green);
  text("Nilai hasil rekognisi = rerata nilai Asesor 1 dan Asesor 2 pada mata kuliah tersebut.", 8, regular, gray);
  y -= 2;

  const rows = decisions || [];
  let no = 1;
  for (const row of rows as any[]) {
    addPageIfNeeded(76);
    const course = row.course_claim?.course;
    const finalScore = recognitionScore(row.course_claim_id);
    page.drawRectangle({ x: left, y: y - 48, width: 491, height: 57, borderColor: rgb(.86,.90,.89), borderWidth: 1, color: rgb(.985,.993,.99) });
    page.drawText(String(no), { x: left + 10, y: y - 10, size: 9, font: bold, color: gray });
    page.drawText(course?.code || "-", { x: left + 35, y: y - 10, size: 9, font: bold, color: green });
    const nameLines = wrapText(course?.name || "-", 43).slice(0, 2);
    nameLines.forEach((line, idx) => page.drawText(line, { x: left + 100, y: y - 10 - idx * 13, size: 9, font: idx === 0 ? bold : regular, color: dark }));
    page.drawText(`${course?.credits || 0} SKS`, { x: left + 355, y: y - 10, size: 8, font: regular, color: gray });
    page.drawText(row.result === "YA" ? "DIREKOGNISI" : "TIDAK", { x: left + 405, y: y - 10, size: 7.5, font: bold, color: row.result === "YA" ? green : rgb(.69,.13,.09) });
    page.drawText(`Nilai: ${finalScore === null ? "-" : finalScore.toFixed(2)}`, { x: left + 355, y: y - 30, size: 8.5, font: bold, color: row.result === "YA" ? green : gray });
    y -= 67;
    no++;
  }

  y -= 4;
  addPageIfNeeded(110);
  text(`Total SKS direkognisi: ${totalSks} SKS`, 11, bold, green);
  text(`Tanggal finalisasi: ${app.finalized_at ? new Date(app.finalized_at).toLocaleString("id-ID") : "-"}`, 9, regular, gray);
  y -= 12;

  text("TIM ASESOR", 10, bold, green);
  const assessors = [assignment?.assessor1, assignment?.assessor2].filter(Boolean) as any[];
  assessors.forEach((a, i) => { text(`Asesor ${i + 1}: ${a.full_name} — NIP ${a.nip}`, 9); });
  y -= 12;
  paragraph("Berita acara ini dibentuk otomatis oleh SuKaRPL berdasarkan snapshot keputusan yudisium FINAL dan data asesmen yang tersimpan di sistem.", 9, 90);
  y -= 20;
  text("Ketua Program Studi", 9, bold, gray, 380);
  y -= 42;
  page.drawText(settings?.head_name || "(Belum diisi)", { x: 380, y, size: 9, font: bold, color: dark });
  y -= 14;
  page.drawText(`NIP ${settings?.head_nip || "-"}`, { x: 380, y, size: 8, font: regular, color: gray });

  const bytes = await pdf.save();
  const safeName = String(participant?.participant_no || "peserta").replace(/[^a-zA-Z0-9_-]/g, "_");
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Berita_Acara_RPL_${safeName}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
