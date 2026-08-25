"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiError } from "@/backend/types";
import { Button } from "@/components/ui/Button";

export function DeleteAccountForm() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-scale-in flex flex-col gap-2">
      <p className="text-sm text-slate-700 dark:text-slate-200">
        Cette action est <strong>définitive</strong> : toutes tes données
        (revenus, dépenses, prêts, épargne, fiches de paie) seront supprimées
        sans possibilité de récupération. Confirme avec ton mot de passe.
      </p>
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
      />
      {error && (
        <p className="animate-fade-in text-sm text-amber-800 dark:text-amber-400">{error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={isSubmitting}>
          {isSubmitting ? "Suppression..." : "Confirmer la suppression"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setIsConfirming(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
