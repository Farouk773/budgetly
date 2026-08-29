"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Small red trash icon used on a single list row (dépense, charge fixe,
 * revenu...). Always confirms via `ConfirmDialog` before calling `DELETE` on
 * the given endpoint, then refreshes the current route so the parent Server
 * Component re-fetches fresh data.
 *
 * Always stops the click from bubbling/navigating first — this makes it safe
 * to use even when a row is otherwise wrapped in a `<Link>`.
 */
export function RowDeleteButton({
  endpoint,
  ariaLabel,
  confirmTitle,
  confirmDescription = "Cette action est définitive et ne peut pas être annulée.",
  className = "",
}: {
  endpoint: string;
  ariaLabel: string;
  confirmTitle: string;
  confirmDescription?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        setError("Impossible de supprimer pour le moment. Réessaie.");
        return;
      }
      setIsConfirming(false);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setIsConfirming(true);
        }}
        disabled={isSubmitting}
        className={`shrink-0 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${className}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={isConfirming}
        title={confirmTitle}
        description={error ?? confirmDescription}
        confirmLabel="Supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsConfirming(false);
          setError(null);
        }}
      />
    </>
  );
}
