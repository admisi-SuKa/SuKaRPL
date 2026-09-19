"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRecognitionResponseAction } from "../actions";

export function RecognitionResponse() {
  const router = useRouter();
  const [choice, setChoice] = useState<"SETUJU" | "TIDAK_SETUJU">("SETUJU");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rpl-card p-5 border-t-4 border-t-[var(--rpl-orange)]">
      <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Tanggapan Hasil Rekognisi</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Tanggapan hanya dapat dikirim satu kali.</p>
      {message && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{message}</div>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${choice === "SETUJU" ? "border-emerald-300 bg-emerald-50" : "border-[var(--line)]"}`}>
          <input type="radio" name="response" className="accent-[var(--rpl-green-800)]" checked={choice === "SETUJU"} onChange={() => setChoice("SETUJU")} />
          <span><span className="block font-black">Setuju</span><span className="text-xs text-[var(--muted)]">Menerima hasil rekognisi.</span></span>
        </label>
        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${choice === "TIDAK_SETUJU" ? "border-amber-300 bg-amber-50" : "border-[var(--line)]"}`}>
          <input type="radio" name="response" className="accent-[var(--rpl-orange)]" checked={choice === "TIDAK_SETUJU"} onChange={() => setChoice("TIDAK_SETUJU")} />
          <span><span className="block font-black">Tidak Setuju</span><span className="text-xs text-[var(--muted)]">Mengajukan keberatan.</span></span>
        </label>
      </div>
      <div className="mt-4">
        <label className="rpl-label">Catatan {choice === "TIDAK_SETUJU" ? "(wajib)" : "(opsional)"}</label>
        <textarea className="rpl-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={choice === "TIDAK_SETUJU" ? "Jelaskan alasan keberatan..." : "Catatan tambahan..."} />
      </div>
      <button type="button" className="rpl-btn rpl-btn-primary mt-4" disabled={pending} onClick={() => {
        if (!window.confirm("Kirim tanggapan? Tanggapan tidak dapat diubah setelah dikirim.")) return;
        startTransition(async () => {
          const result = await submitRecognitionResponseAction(choice, note);
          if (!result.ok) setMessage(result.error || "Gagal mengirim tanggapan.");
          else router.refresh();
        });
      }}><i className="bi bi-send-check" /> {pending ? "Mengirim..." : "Kirim Tanggapan"}</button>
    </div>
  );
}
