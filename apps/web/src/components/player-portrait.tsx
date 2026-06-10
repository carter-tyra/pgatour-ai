"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const avatarExtensions = ["webp", "png", "jpg", "jpeg"] as const;

export function playerImageSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PlayerPortrait({
  name,
  slug = playerImageSlug(name),
  className,
  imageClassName,
  fallbackClassName,
}: {
  name: string;
  slug?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [failedIndexes, setFailedIndexes] = useState<Record<string, number>>({});
  const candidateIndex = failedIndexes[slug] ?? 0;
  const extension = avatarExtensions[candidateIndex];
  const src = extension ? `/player-avatars/${slug}.${extension}` : null;

  return (
    <Avatar
      aria-label={name}
      className={cn(
        "overflow-hidden rounded-xl bg-[color-mix(in_oklch,var(--primary)_7%,var(--background))] after:rounded-xl",
        className,
      )}
    >
      {src ? (
        <AvatarImage
          alt={`${name} headshot`}
          className={cn("rounded-xl object-cover object-top grayscale-[8%]", imageClassName)}
          key={src}
          onError={() =>
            setFailedIndexes((current) => ({
              ...current,
              [slug]: (current[slug] ?? 0) + 1,
            }))
          }
          src={src}
        />
      ) : null}
      {src ? null : (
        <AvatarFallback
          className={cn(
            "rounded-xl bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] font-heading font-medium text-primary",
            fallbackClassName,
          )}
        >
          {initialsFor(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
