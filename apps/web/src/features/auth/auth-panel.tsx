"use client";

import { Activity, ArrowRight, Login } from "@carbon/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AuthPanelProps = {
  callbackUrl?: string | undefined;
  mode: "login" | "register";
};

function safeCallbackUrl(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function fieldValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function AuthPanel({ callbackUrl, mode }: AuthPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isRegister = mode === "register";
  const destination = safeCallbackUrl(callbackUrl);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = fieldValue(formData, "email");
    const password = fieldValue(formData, "password");
    const name = fieldValue(formData, "name");

    try {
      const response = isRegister
        ? await authClient.signUp.email({
            callbackURL: destination,
            email,
            name,
            password,
          })
        : await authClient.signIn.email({
            callbackURL: destination,
            email,
            password,
          });

      if (response.error) {
        setError(response.error.message ?? "Authentication failed.");
        return;
      }

      router.push(destination);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid min-h-svh w-full max-w-7xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.52fr)] md:items-center md:px-4">
        <section className="flex min-h-[42svh] flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.72)] md:min-h-[calc(100svh-4rem)]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">PGAI</div>
              <div className="text-xs text-muted-foreground">Analysis only</div>
            </div>
          </div>

          <div className="max-w-xl py-12 md:py-0">
            <h1 className="text-balance font-heading text-4xl font-medium leading-tight md:text-6xl">
              Golf intelligence for real decisions.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Track edges, lineups, alerts, and portfolio risk without sportsbook credentials.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {["No bet placement", "User-owned tracker", "Source-backed data"].map((item) => (
              <div
                className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_0_oklch(1_0_0/0.76),0_24px_70px_oklch(0.21_0.006_95/0.12)] md:p-7">
          <div className="mb-6">
            <div className="mb-3 grid size-10 place-items-center rounded-xl border border-border bg-background text-muted-foreground">
              <Login className="size-5" />
            </div>
            <h2 className="text-2xl font-medium">{isRegister ? "Create account" : "Sign in"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRegister ? "Start with an email and password." : "Use your PGAI account."}
            </p>
          </div>

          <form className="grid gap-5" onSubmit={handleSubmit}>
            <FieldGroup>
              {isRegister ? (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input autoComplete="name" className="h-10" id="name" name="name" required />
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  className="h-10"
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className="h-10"
                  id="password"
                  minLength={10}
                  name="password"
                  required
                  type="password"
                />
              </Field>
            </FieldGroup>

            <FieldError>{error}</FieldError>

            <Button className="h-10 w-full" disabled={isPending} type="submit">
              {isPending ? "Working" : isRegister ? "Create account" : "Sign in"}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </form>

          <div className="mt-5 text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "New to PGAI?"}{" "}
            <Link
              className={cn("font-medium text-foreground underline-offset-4 hover:underline")}
              href={{
                pathname: isRegister ? "/login" : "/register",
                query: destination === "/dashboard" ? undefined : { callbackUrl: destination },
              }}
            >
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
