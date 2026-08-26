"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiError } from "@/backend/types";
import { Button } from "@/components/ui/Button";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setEmail("");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email de ton/ta partenaire"
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
        <Button type="submit" disabled={isSubmitting}>
          Inviter
        </Button>
        {email.trim() !== "" && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEmail("")}
          >
            Annuler
          </Button>
        )}
      </div>
      {error && (
        <p className="animate-fade-in mt-2 text-sm text-amber-800 dark:text-amber-400">{error}</p>
      )}
    </form>
  );
}
