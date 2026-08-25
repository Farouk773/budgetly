"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiError } from "@/backend/types";

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
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-sm text-slate-700">
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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
      {error && <p className="text-sm text-amber-800">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSubmitting ? "Suppression..." : "Confirmer la suppression"}
        </button>
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
