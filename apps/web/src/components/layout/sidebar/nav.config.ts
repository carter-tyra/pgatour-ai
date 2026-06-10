import {
  Activity,
  Analytics,
  Application,
  Bot,
  type CarbonIconProps,
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
  icon: React.ComponentType<CarbonIconProps>;
  badge?: SidebarBadgeType;
  dot?: SidebarDot;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<CarbonIconProps>;
  defaultOpen?: boolean;
  items: SidebarItem[];
};

export const brand = {
  label: "PGA Tour AI",
  href: "/dashboard/betting",
  icon: Activity as React.ComponentType<CarbonIconProps>,
};

export const sidebarNav: SidebarGroup[] = [
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Analytics as React.ComponentType<CarbonIconProps>,
    defaultOpen: true,
    items: [
      {
        label: "Research",
        href: "/dashboard/research",
        icon: Search as React.ComponentType<CarbonIconProps>,
      },
      {
        label: "Betting",
        href: "/dashboard/betting",
        icon: CurrencyDollar as React.ComponentType<CarbonIconProps>,
      },
      {
        label: "Fantasy",
        href: "/dashboard/fantasy",
        icon: Trophy as React.ComponentType<CarbonIconProps>,
      },
    ],
  },
  {
    id: "live",
    label: "Live",
    icon: Radio as React.ComponentType<CarbonIconProps>,
    defaultOpen: true,
    items: [
      {
        label: "Live",
        href: "/dashboard/live",
        icon: Radio as React.ComponentType<CarbonIconProps>,
      },
      {
        label: "Portfolio",
        href: "/dashboard/portfolio",
        icon: Wallet as React.ComponentType<CarbonIconProps>,
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Application as React.ComponentType<CarbonIconProps>,
    defaultOpen: true,
    items: [
      {
        label: "Brandel",
        href: "/dashboard/brandel",
        icon: Bot as React.ComponentType<CarbonIconProps>,
      },
      {
        label: "Account",
        href: "/dashboard/account",
        icon: UserAvatar as React.ComponentType<CarbonIconProps>,
      },
    ],
  },
];

export type SocialLink = {
  label: string;
  href: string;
  icon: React.ComponentType<CarbonIconProps>;
};

// Placeholder URLs — swap in real handles when available.
export const socialLinks: SocialLink[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Activity as React.ComponentType<CarbonIconProps>,
  },
  { label: "X", href: "#", icon: LogoX as React.ComponentType<CarbonIconProps> },
  {
    label: "GitHub",
    href: "#",
    icon: LogoGithub as React.ComponentType<CarbonIconProps>,
  },
  {
    label: "Instagram",
    href: "#",
    icon: LogoInstagram as React.ComponentType<CarbonIconProps>,
  },
];
