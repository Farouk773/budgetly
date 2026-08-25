import { getCurrentUser } from "@/backend/auth";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>

      <div className="card-surface mt-6 p-5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Mes données</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Conformément au RGPD, tu peux exporter l&apos;ensemble de tes
          données à tout moment.
        </p>
        <a
          href="/api/account/export"
          className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          Exporter mes données (JSON)
        </a>
      </div>

      <div className="card-surface mt-4 p-5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Zone de danger</p>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
