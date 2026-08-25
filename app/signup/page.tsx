"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PiggyBank, ShieldCheck, Sparkles } from "lucide-react";
import type { ApiError } from "@/backend/types";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Impossible de se connecter au serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white md:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative flex items-center gap-2 font-heading text-xl font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <PiggyBank className="h-5 w-5" />
            </span>
            Budgetly
          </div>
          <div className="relative">
            <h2 className="font-heading text-2xl font-semibold leading-snug">
              Commence à suivre ton budget en quelques secondes.
            </h2>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-teal-50">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                Gratuit pour le suivi manuel
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Mot de passe chiffré, données privées
              </li>
            </ul>
          </div>
          <p className="relative text-xs text-teal-100/80">
            © {new Date().getFullYear()} Budgetly
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="font-heading text-xl font-semibold text-slate-900">
            Créer un compte
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Commence à suivre ton budget en quelques secondes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nom (optionnel)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <span className="text-xs text-slate-400">Au moins 8 caractères</span>
            </div>

            {error && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-lg bg-teal-700 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-teal-700 hover:text-teal-800">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
