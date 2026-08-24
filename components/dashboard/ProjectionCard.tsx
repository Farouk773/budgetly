import { Calculator } from "lucide-react";
import { formatCents } from "@/lib/money";

export function ProjectionCard({
  balanceCents,
  monthlyAvailableCents,
  projectedCents,
}: {
  balanceCents: number;
  monthlyAvailableCents: number;
  projectedCents: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-700">
        <Calculator className="h-4 w-4 text-teal-600" />
        Projection de fin de mois
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Ton solde d&apos;aujourd&apos;hui, plus ce qu&apos;il te reste (ou
        manque) sur ce mois.
      </p>

      <div className="mt-3 flex flex-col divide-y divide-slate-100 text-sm">
        <div className="flex justify-between py-2">
          <span className="text-slate-500">Solde bancaire actuel</span>
          <span className="font-medium text-slate-900">
            {formatCents(balanceCents)}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-slate-500">
            {monthlyAvailableCents >= 0 ? "+ Disponible ce mois" : "- Manque ce mois"}
          </span>
          <span className="font-medium text-slate-900">
            {formatCents(monthlyAvailableCents)}
          </span>
        </div>
        <div className="flex justify-between pt-2 text-sm">
          <span className="font-medium text-slate-700">= Total projeté</span>
          <span className="font-heading text-base font-semibold text-teal-700">
            {formatCents(projectedCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
