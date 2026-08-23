import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <AppHeader user={user} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
