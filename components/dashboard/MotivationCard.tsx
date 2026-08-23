import type { MotivationSnapshot } from "@/lib/types";

export function MotivationCard({ snapshot }: { snapshot: MotivationSnapshot }) {
  const achievedBadges = snapshot.badges.filter((b) => b.achieved);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-700">{snapshot.message}</p>

      {achievedBadges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {achievedBadges.map((badge) => (
            <span
              key={badge.id}
              title={badge.description}
              className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
            >
              🏅 {badge.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
