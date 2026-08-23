import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { getPartnerLinks, getHouseholdSummary } from "@/lib/queries/household";
import { toPartnerLinkDto } from "@/lib/serializers/household";
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
      <h1 className="font-heading text-xl font-semibold text-slate-900">
        Budget partagé (couple / famille)
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Invite un·e partenaire pour voir une vue commune de vos budgets.
        Chacun garde ses données privées ; seule une synthèse est partagée,
        et seulement une fois l&apos;invitation acceptée des deux côtés.
      </p>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
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
          <h2 className="text-lg font-semibold text-slate-900">
            Vue commune — {summary.month}
          </h2>

          <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Revenus cumulés</span>
              <span className="font-medium text-slate-900">
                {formatCents(summary.combined.incomeCents)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Charges fixes cumulées</span>
              <span className="font-medium text-slate-900">
                -{formatCents(summary.combined.fixedChargesCents)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Mensualités de prêts cumulées</span>
              <span className="font-medium text-slate-900">
                -{formatCents(summary.combined.loanPaymentsCents)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Dépenses cumulées</span>
              <span className="font-medium text-slate-900">
                -{formatCents(summary.combined.expensesCents)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm">
              <span className="font-medium text-slate-700">Disponible du foyer</span>
              <span className="font-semibold text-slate-900">
                {formatCents(summary.combined.availableCents)}
              </span>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {summary.members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-100"
              >
                <span className="text-slate-700">
                  {member.userId === user.id
                    ? "Toi"
                    : member.name || member.email}
                </span>
                <span className="font-medium text-slate-900">
                  {formatCents(member.availableCents)} disponible
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
