import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  Repeat,
  PiggyBank,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, primary: true },
  { href: "/expenses", label: "Dépenses", icon: ShoppingBag, primary: true },
  { href: "/incomes", label: "Revenus", icon: Wallet, primary: true },
  { href: "/savings", label: "Épargne", icon: PiggyBank, primary: true },
  { href: "/loans", label: "Prêts", icon: Landmark, primary: true },
  { href: "/fixed-charges", label: "Charges fixes", icon: Repeat },
  { href: "/household", label: "Foyer", icon: Users },
];
