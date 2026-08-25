"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerLink } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const STATUS_LABELS: Record<PartnerLink["status"], string> = {
  PENDING: "En attente",
  ACCEPTED: "Actif",
  DECLINED: "Refusé",
};

export function LinkRow({ link }: { link: PartnerLink }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  async function callAction(path: string, method: string) {
    setIsSubmitting(true);
    try {
      await fetch(path, { method });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const removeLabel =
    link.status === "PENDING" && link.direction === "sent" ? "Annuler" : "Retirer";

  return (
    <li className="card-surface flex items-center justify-between p-5">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {link.otherUser.name || link.otherUser.email}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {STATUS_LABELS[link.status]}
          {link.direction === "sent" ? " · invitation envoyée" : " · invitation reçue"}
        </p>
      </div>

      <div className="flex gap-2">
        {link.status === "PENDING" && link.direction === "received" && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => callAction(`/api/household/${link.id}/accept`, "POST")}
            >
              Accepter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => callAction(`/api/household/${link.id}/decline`, "POST")}
            >
              Refuser
            </Button>
          </>
        )}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setIsConfirmingRemove(true)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          {removeLabel}
        </button>
      </div>

      <ConfirmDialog
        open={isConfirmingRemove}
        title={`${removeLabel} cette invitation ?`}
        confirmLabel={removeLabel}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          setIsConfirmingRemove(false);
          callAction(`/api/household/${link.id}`, "DELETE");
        }}
        onCancel={() => setIsConfirmingRemove(false)}
      />
    </li>
  );
}
