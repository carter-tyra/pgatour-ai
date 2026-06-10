import Image from "next/image";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  image?: string | null | undefined;
  name?: string | null | undefined;
  email?: string | null | undefined;
  className?: string | undefined;
};

function initials(name?: string | null, email?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) || "PG").toUpperCase();
}

export function UserAvatar({ image, name, email, className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted text-xs font-medium text-muted-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
        className,
      )}
      aria-hidden="true"
    >
      {image ? (
        <Image
          alt={name ?? ""}
          className="size-full object-cover"
          height={32}
          src={image}
          width={32}
        />
      ) : null}
      {!image ? (
        <span className="flex size-full items-center justify-center">{initials(name, email)}</span>
      ) : null}
    </span>
  );
}
