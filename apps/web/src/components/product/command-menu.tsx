"use client";

import { Search } from "@carbon/icons-react";
import Link from "next/link";
import { type ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMountEffect } from "@/hooks/use-mount-effect";

const actions = [
  { label: "Research", href: "/dashboard/research" },
  { label: "Betting", href: "/dashboard/betting" },
  { label: "Fantasy", href: "/dashboard/fantasy" },
  { label: "Live", href: "/dashboard/live" },
  { label: "Portfolio", href: "/dashboard/portfolio" },
  { label: "AI Analyst", href: "/dashboard/ai" },
] as const;

export function CommandMenu({
  trigger,
  shortcut = false,
}: {
  trigger?: ReactElement;
  shortcut?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useMountEffect(() => {
    if (!shortcut) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="hidden h-10 w-full min-w-lg justify-start gap-2 rounded-md bg-toolbar px-3 text-muted-foreground/80 md:flex"
            />
          }
        >
          <Search size={16} data-icon="inline-start" className="text-muted-foreground/50" />
          Search
        </DialogTrigger>
      )}
      <DialogContent className="min-w-2xl p-0 backdrop-blur-lg backdrop-saturate-150">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Open a tool or page.</DialogDescription>
        </DialogHeader>
        <div className="p-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pgai"
            className="h-10"
          />
          <div className="mt-3 grid gap-1">
            {visibleActions.map((action) => (
              <Button
                key={action.href}
                variant="ghost"
                className="justify-start"
                nativeButton={false}
                render={<Link href={action.href} />}
                onClick={() => setOpen(false)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
