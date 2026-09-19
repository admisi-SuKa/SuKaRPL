"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_ADMISI_PHOTO_BASE_URL } from "@/lib/participant-photo";

type ParticipantPhotoProps = {
  registrationNo?: string | null;
  directUrl?: string | null;
  name?: string | null;
  className?: string;
  iconClassName?: string;
};

export function ParticipantPhoto({ registrationNo, directUrl, name, className, iconClassName }: ParticipantPhotoProps) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const direct = String(directUrl || "").trim();
    if (/^https?:\/\//i.test(direct)) list.push(direct);

    const number = String(registrationNo || "").trim();
    if (number) {
      const configured = String(process.env.NEXT_PUBLIC_ADMISI_PHOTO_BASE_URL || DEFAULT_ADMISI_PHOTO_BASE_URL).replace(/\/$/, "");
      list.push(`${configured}/${encodeURIComponent(number)}.png`);
      list.push(`${configured}/${encodeURIComponent(number)}.jpg`);
    }
    return Array.from(new Set(list));
  }, [directUrl, registrationNo]);

  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [candidates]);
  const src = candidates[index];

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[#eef5f3] text-[var(--rpl-green-700)]",
        className || "h-11 w-11"
      )}
      title={name || "Foto calon mahasiswa"}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt={name ? `Foto ${name}` : "Foto calon mahasiswa"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <i className={cn("bi bi-person-fill", iconClassName || "text-xl")} aria-hidden="true" />
      )}
    </div>
  );
}
