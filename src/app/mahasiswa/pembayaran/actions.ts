"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Tanggal pembayaran wajib diisi."),
  paymentMethod: z.enum(["TRANSFER_BANK", "VIRTUAL_ACCOUNT", "OTHER"]),
  payerName: z.string().trim().min(2, "Nama pemilik rekening/pengirim wajib diisi.").max(180),
  proofUrl: z.string().trim().url("Link bukti pembayaran tidak valid.").refine((value) => /^https?:\/\//i.test(value), "Link harus diawali http:// atau https://."),
  studentNote: z.string().trim().max(1000).optional().default("")
});

export async function submitPaymentAction(input: z.infer<typeof paymentSchema>) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data pembayaran tidak valid." };

  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("id").eq("profile_id", profile.id).maybeSingle();
  if (!participant) return { ok: false, error: "Data mahasiswa tidak ditemukan." };

  const { data: application } = await supabase.from("applications").select("id,status").eq("participant_id", participant.id).maybeSingle();
  if (!application) return { ok: false, error: "Buat pengajuan RPL terlebih dahulu sebelum mengirim bukti pembayaran." };
  if (application.status === "FINAL") return { ok: false, error: "Pengajuan sudah final. Bukti pembayaran tidak dapat diubah." };

  const { data: current } = await supabase.from("payments").select("id,status").eq("application_id", application.id).maybeSingle();
  if (current?.status === "VERIFIED") return { ok: false, error: "Pembayaran sudah terverifikasi dan tidak dapat diubah." };
  if (current?.status === "SUBMITTED") return { ok: false, error: "Bukti pembayaran sedang menunggu verifikasi Prodi." };

  const payload = {
    application_id: application.id,
    participant_id: participant.id,
    payment_date: parsed.data.paymentDate,
    payment_method: parsed.data.paymentMethod,
    payer_name: parsed.data.payerName,
    proof_url: parsed.data.proofUrl,
    student_note: parsed.data.studentNote || null,
    status: "SUBMITTED" as const,
    verification_note: null,
    verified_by: null,
    verified_at: null,
    submitted_at: new Date().toISOString()
  };

  const result = current
    ? await supabase.from("payments").update(payload).eq("id", current.id).eq("status", "REJECTED")
    : await supabase.from("payments").insert(payload);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/mahasiswa");
  revalidatePath("/mahasiswa/pembayaran");
  revalidatePath("/prodi/pembayaran");
  return { ok: true };
}
