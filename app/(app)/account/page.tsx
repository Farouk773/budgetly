import { getCurrentUser } from "@/lib/auth";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-500">{user?.email}</p>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-medium text-slate-700">Mes données</p>
        <p className="mt-1 text-sm text-slate-500">
          Conformément au RGPD, tu peux exporter l&apos;ensemble de tes
          données à tout moment.
        </p>
        <a
          href="/api/account/export"
          className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exporter mes données (JSON)
        </a>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-medium text-slate-700">Zone de danger</p>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
