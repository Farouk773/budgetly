"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PiggyBank, ShieldCheck, TrendingUp } from "lucide-react";
import type { ApiError } from "@/backend/types";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      <div className="card-elevated grid w-full max-w-4xl md:grid-cols-2">
        <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white md:flex">
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
              Garde le contrôle de ton budget, sans stress.
            </h2>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 shrink-0" />
                Solde disponible en temps réel
              </li>
              <li className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 shrink-0" />
                Objectifs d&apos;épargne suivis automatiquement
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Tes données restent privées et à toi
              </li>
            </ul>
          </div>
          <p className="relative text-xs text-white/70">
            © {new Date().getFullYear()} Budgetly
          </p>
        </div>

        <div className="bg-surface p-8 sm:p-10">
          <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Accède à ton suivi de budget.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
              />
            </div>

            {error && (
              <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full py-2.5">
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
