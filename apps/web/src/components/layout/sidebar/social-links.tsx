import Link from "next/link";
import { cn } from "@/lib/utils";
import { socialLinks } from "./nav.config";

export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 border-sidebar-border border-t", className)}>
      {socialLinks.map((link) => {
        const external = link.href.startsWith("http");

        return (
          <Link
            key={link.label}
            href={link.href}
            aria-label={link.label}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="flex h-(--aside-width) items-center justify-center text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <link.icon className="size-4" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
