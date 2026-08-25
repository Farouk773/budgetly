"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Blocking confirmation for destructive actions (delete, etc.).
 * Always pairs a neutral "Annuler" with the confirming action, per the
 * app's design system — see DESIGN_SYSTEM.md.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  isDangerous = true,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="card-elevated w-full max-w-sm animate-scale-in p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={isDangerous ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
