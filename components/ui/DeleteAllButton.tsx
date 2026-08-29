"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * "Tout supprimer" button placed near a page's primary "Ajouter..." action.
 * Deliberately styled in red/outlined (never `bg-brand-gradient`, reserved
 * for the primary add action) since it's a destructive, secondary action.
 * Hidden entirely when there is nothing to delete.
 */
export function DeleteAllButton({
  endpoint,
  count,
  label = "Tout supprimer",
  confirmTitle,
  confirmDescription,
}: {
  endpoint: string;
  count: number;
  label?: string;
  confirmTitle: string;
  confirmDescription: string;
}) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  async function handleDeleteAll() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        setError("Impossible de tout supprimer pour le moment. Réessaie.");
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
        onClick={() => {
          setError(null);
          setIsConfirming(true);
        }}
        disabled={isSubmitting}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
      <ConfirmDialog
        open={isConfirming}
        title={confirmTitle}
        description={error ?? confirmDescription}
        confirmLabel="Tout supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDeleteAll}
        onCancel={() => {
          setIsConfirming(false);
          setError(null);
        }}
      />
    </>
  );
}
