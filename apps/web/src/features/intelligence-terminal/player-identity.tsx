import { PlayerPortrait } from "@/components/player-portrait";
import type { PlayerIntelligence } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";

export function PlayerIdentity({
  player,
  meta,
  rank,
  size = "md",
  className,
}: {
  player: PlayerIntelligence;
  meta?: string;
  rank?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const portraitClassName = {
    sm: "size-9 rounded-lg after:rounded-lg",
    md: "size-10 rounded-lg after:rounded-lg",
    lg: "size-12 rounded-xl after:rounded-xl",
  }[size];

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <PlayerPortrait
        className={portraitClassName}
        fallbackClassName={cn(size === "lg" ? "rounded-xl text-sm" : "rounded-lg text-xs")}
        imageClassName={cn(size === "lg" ? "rounded-xl" : "rounded-lg")}
        name={player.name}
      />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {rank ? (
            <span className="shrink-0 text-[0.68rem] font-medium text-muted-foreground">
              #{rank}
            </span>
          ) : null}
          <div className="truncate font-medium text-foreground">{player.name}</div>
        </div>
        {meta ? <div className="truncate text-xs text-muted-foreground">{meta}</div> : null}
      </div>
    </div>
  );
}

export function PlayerStack({ players: stackPlayers }: { players: PlayerIntelligence[] }) {
  return (
    <div className="flex items-center">
      {stackPlayers.slice(0, 4).map((player, index) => (
        <span className={cn("block", index > 0 && "-ml-2.5")} key={player.id}>
          <PlayerPortrait
            className="size-9 rounded-full border-2 border-card bg-muted after:rounded-full"
            fallbackClassName="rounded-full text-xs"
            imageClassName="rounded-full"
            name={player.name}
          />
        </span>
      ))}
    </div>
  );
}
