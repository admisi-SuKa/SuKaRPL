"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPaymentAction } from "./actions";

type Payment = {
  payment_date?: string | null;
  payment_method?: string | null;
  payer_name?: string | null;
  proof_url?: string | null;
  student_note?: string | null;
  status?: string | null;
};

export function PaymentForm({ payment }: { payment?: Payment | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    paymentDate: payment?.payment_date || "",
    paymentMethod: (payment?.payment_method || "TRANSFER_BANK") as "TRANSFER_BANK" | "VIRTUAL_ACCOUNT" | "OTHER",
    payerName: payment?.payer_name || "",
    proofUrl: payment?.proof_url || "",
    studentNote: payment?.student_note || ""
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await submitPaymentAction(form);
      if (result.ok) {
        setMessage({ ok: true, text: "Bukti pembayaran berhasil dikirim dan menunggu verifikasi Prodi." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error || "Gagal mengirim bukti pembayaran." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message && <div className={`rounded-xl border p-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rpl-label" htmlFor="paymentDate">Tanggal Pembayaran</label>
          <input id="paymentDate" type="date" className="rpl-input" required value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
        </div>
        <div>
          <label className="rpl-label" htmlFor="paymentMethod">Metode Pembayaran</label>
          <select id="paymentMethod" className="rpl-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}>
            <option value="TRANSFER_BANK">Transfer Bank</option>
            <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>
      </div>

      <div>
        <label className="rpl-label" htmlFor="payerName">Nama Pemilik Rekening / Pengirim</label>
        <input id="payerName" className="rpl-input" required maxLength={180} placeholder="Nama sesuai rekening/pengirim" value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
      </div>

      <div>
        <label className="rpl-label" htmlFor="proofUrl">Link Bukti Pembayaran</label>
        <div className="relative">
          <i className="bi bi-link-45deg rpl-field-icon" aria-hidden="true" />
          <input id="proofUrl" type="url" className="rpl-input rpl-input-with-icon" required placeholder="https://drive.google.com/..." value={form.proofUrl} onChange={(e) => setForm({ ...form, proofUrl: e.target.value })} />
        </div>
        <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">Pastikan link dapat dibuka oleh Prodi. Jika memakai Google Drive/OneDrive, atur izin akses sesuai ketentuan institusi.</p>
      </div>

      <div>
        <label className="rpl-label" htmlFor="studentNote">Catatan <span className="font-normal text-[var(--muted)]">(opsional)</span></label>
        <textarea id="studentNote" className="rpl-textarea min-h-24" maxLength={1000} placeholder="Keterangan tambahan jika diperlukan" value={form.studentNote} onChange={(e) => setForm({ ...form, studentNote: e.target.value })} />
      </div>

      <button type="submit" className="rpl-btn rpl-btn-primary w-full sm:w-auto" disabled={pending}>
        <i className={`bi ${pending ? "bi-arrow-repeat" : "bi-send-check"}`} /> {pending ? "Mengirim..." : payment?.status === "REJECTED" ? "Kirim Ulang Bukti Pembayaran" : "Kirim Bukti Pembayaran"}
      </button>
    </form>
  );
}
