"use client";

import { useEffect, useState } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function todayKey(): string {
  return new Date().toDateString();
}

/** Shows today's date, re-rendered automatically at the next local midnight
 * (checked on a light interval rather than a single long timeout, so it
 * still catches up correctly if the tab was asleep/backgrounded). */
export function TodayDate() {
  const [key, setKey] = useState(todayKey());

  useEffect(() => {
    const id = setInterval(() => {
      const current = todayKey();
      setKey((previous) => (previous === current ? previous : current));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const label = DATE_FORMATTER.format(new Date(key));

  return (
    <span className="hidden text-xs capitalize text-slate-400 dark:text-slate-500 md:inline">
      {label}
    </span>
  );
}
