import { Award, Sparkle } from "lucide-react";
import type { MotivationSnapshot } from "@/backend/types";

export function MotivationCard({ snapshot }: { snapshot: MotivationSnapshot }) {
  const achievedBadges = snapshot.badges.filter((b) => b.achieved);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="flex items-start gap-2 text-sm text-slate-700">
        <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        {snapshot.message}
      </p>

      {achievedBadges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {achievedBadges.map((badge) => (
            <span
              key={badge.id}
              title={badge.description}
              className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
            >
              <Award className="h-3.5 w-3.5" />
              {badge.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
