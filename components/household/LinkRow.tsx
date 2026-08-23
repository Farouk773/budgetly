"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerLink } from "@/lib/types";

const STATUS_LABELS: Record<PartnerLink["status"], string> = {
  PENDING: "En attente",
  ACCEPTED: "Actif",
  DECLINED: "Refusé",
};

export function LinkRow({ link }: { link: PartnerLink }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function callAction(path: string, method: string) {
    setIsSubmitting(true);
    try {
      await fetch(path, { method });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-900">
          {link.otherUser.name || link.otherUser.email}
        </p>
        <p className="text-xs text-zinc-500">
          {STATUS_LABELS[link.status]}
          {link.direction === "sent" ? " · invitation envoyée" : " · invitation reçue"}
        </p>
      </div>

      <div className="flex gap-2">
        {link.status === "PENDING" && link.direction === "received" && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => callAction(`/api/household/${link.id}/accept`, "POST")}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Accepter
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => callAction(`/api/household/${link.id}/decline`, "POST")}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Refuser
            </button>
          </>
        )}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => callAction(`/api/household/${link.id}`, "DELETE")}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          {link.status === "PENDING" && link.direction === "sent"
            ? "Annuler"
            : "Retirer"}
        </button>
      </div>
    </li>
  );
}
