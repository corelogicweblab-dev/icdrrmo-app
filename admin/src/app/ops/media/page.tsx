"use client";

import type { ReactElement } from "react";
import { BadgeCheck, FileImage, FolderArchive, Shield, Video } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsMediaPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-2">
      <OpsPanelCard title="Evidence vault" subtitle="Photos · video · OCR documents · ID verification">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <FileImage className="h-5 w-5 text-sky-400 shrink-0" aria-hidden /> EXIF-preserving originals + signed URLs
          </li>
          <li className="flex gap-3">
            <Video className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden /> HLS chunked playback for bodycam offload
          </li>
          <li className="flex gap-3">
            <FolderArchive className="h-5 w-5 text-amber-400 shrink-0" aria-hidden /> Bundle export for legal discovery
          </li>
          <li className="flex gap-3">
            <BadgeCheck className="h-5 w-5 text-rose-400 shrink-0" aria-hidden /> National ID OCR + verifier queue
          </li>
          <li className="flex gap-3">
            <Shield className="h-5 w-5 text-zinc-500 shrink-0" aria-hidden /> Entangled hash chain anchored to Audit log
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Upload ingestion (planned)">
        <div className="rounded-xl border border-dashed border-white/15 bg-black/35 p-14 text-center text-sm text-zinc-500 pointer-events-none">
          Drag incident media staging area — multipart upload to encrypted object storage.
        </div>
      </OpsPanelCard>
    </div>
  );
}
