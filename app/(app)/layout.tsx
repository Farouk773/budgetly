import { redirect } from "next/navigation";
import { getCurrentUser } from "@/backend/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";

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
    <CurrencyProvider currency={user.currency}>
      <div className="flex flex-1 flex-col">
        <AppHeader user={user} />
        <div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div>
        <BottomNav />
      </div>
    </CurrencyProvider>
  );
}
