import { getCurrentUser } from "@/backend/auth";
import { formatCents } from "@/backend/money";
import { CURRENCY_LABELS } from "@/backend/types";
import { getPartnerLinks, getHouseholdSummary } from "@/backend/queries/household";
import { toPartnerLinkDto } from "@/backend/serializers/household";
import { InviteForm } from "@/components/household/InviteForm";
import { LinkRow } from "@/components/household/LinkRow";

export default async function HouseholdPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [links, summary] = await Promise.all([
    getPartnerLinks(user.id),
    getHouseholdSummary(user.id),
  ]);

  const linkDtos = links.map((link) => toPartnerLinkDto(link, user.id));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Budget partagé (couple / famille)
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Invite un·e partenaire pour voir une vue commune de vos budgets.
        Chacun garde ses données privées ; seule une synthèse est partagée,
        et seulement une fois l&apos;invitation acceptée des deux côtés.
      </p>

      <div className="card-surface mt-6 p-5">
        <InviteForm />
      </div>

      {linkDtos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {linkDtos.map((link) => (
            <LinkRow key={link.id} link={link} />
          ))}
        </ul>
      )}

      {summary.members.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Vue commune — {summary.month}
          </h2>

          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Les montants combinés sont affichés dans ta devise (
            {CURRENCY_LABELS[user.currency]}) sans conversion — vérifie que
            vous utilisez la même devise si vous comparez vos chiffres.
          </p>

          <div className="card-surface mt-3 p-5">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Revenus cumulés</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatCents(summary.combined.incomeCents, user.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Charges fixes cumulées</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                -{formatCents(summary.combined.fixedChargesCents, user.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Paiements de prêts cumulés</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                -{formatCents(summary.combined.loanPaymentsCents, user.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Dépenses cumulées</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                -{formatCents(summary.combined.expensesCents, user.currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm dark:border-white/10">
              <span className="font-medium text-slate-700 dark:text-slate-200">Disponible du foyer</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCents(summary.combined.availableCents, user.currency)}
              </span>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {summary.members.map((member) => (
              <li
                key={member.userId}
                className="card-surface flex items-center justify-between p-4 text-sm"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {member.userId === user.id
                    ? "Toi"
                    : member.name || member.email}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCents(member.availableCents, user.currency)} disponible
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
