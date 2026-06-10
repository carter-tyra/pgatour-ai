import {
  Activity,
  Analytics,
  Application,
  Bot,
  type CarbonIconType,
  CurrencyDollar,
  LogoGithub,
  LogoInstagram,
  LogoX,
  Radio,
  Search,
  Trophy,
  UserAvatar,
  Wallet,
} from "@carbon/icons-react";

export type SidebarDot = "red" | "blue" | "green" | "yellow";
export type SidebarBadgeType = "new" | "updated" | "internal";

export type SidebarItem = {
  label: string;
  href: string;
  icon: CarbonIconType;
  badge?: SidebarBadgeType;
  dot?: SidebarDot;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: CarbonIconType;
  defaultOpen?: boolean;
  items: SidebarItem[];
};

export const brand = {
  label: "PGA Tour AI",
  href: "/dashboard/betting",
  icon: Activity,
};

export const sidebarNav: SidebarGroup[] = [
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Analytics,
    defaultOpen: true,
    items: [
      {
        label: "Research",
        href: "/dashboard/research",
        icon: Search,
      },
      {
        label: "Betting",
        href: "/dashboard/betting",
        icon: CurrencyDollar,
      },
      {
        label: "Fantasy",
        href: "/dashboard/fantasy",
        icon: Trophy,
      },
    ],
  },
  {
    id: "live",
    label: "Live",
    icon: Radio,
    defaultOpen: true,
    items: [
      {
        label: "Live",
        href: "/dashboard/live",
        icon: Radio,
      },
      {
        label: "Portfolio",
        href: "/dashboard/portfolio",
        icon: Wallet,
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Application,
    defaultOpen: true,
    items: [
      {
        label: "Brandel",
        href: "/dashboard/ai",
        icon: Bot,
      },
      {
        label: "Account",
        href: "/dashboard/account",
        icon: UserAvatar,
      },
    ],
  },
];

export type SocialLink = {
  label: string;
  href: string;
  icon: CarbonIconType;
};

// Placeholder URLs — swap in real handles when available.
export const socialLinks: SocialLink[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Activity,
  },
  { label: "X", href: "#", icon: LogoX },
  {
    label: "GitHub",
    href: "#",
    icon: LogoGithub,
  },
  {
    label: "Instagram",
    href: "#",
    icon: LogoInstagram,
  },
];
