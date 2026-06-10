"use client";

import { Logout } from "@carbon/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/product/theme-toggle";
import { UserAvatar } from "@/components/product/user-avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function Header() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <header className="sticky shrink-0 rounded-t-2xl top-0 z-30 flex h-12 items-center gap-3 px-4 md:px-6">
      <SidebarTrigger />
      <div className="flex flex-1 items-center gap-2 px-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">PGAI</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        {/* <div className="hidden justify-start md:flex px-3">
          <CommandMenu />
        </div> */}
        <div className="flex min-w-0 items-center justify-end gap-2 ml-auto px-3">
          <ThemeToggle />
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            render={<Link href="/dashboard/account" aria-label="Account" />}
          >
            <UserAvatar
              image={user?.image}
              name={user?.name}
              email={user?.email}
              className="size-7 rounded-lg border-0"
            />
          </Button>
          <Button aria-label="Sign out" onClick={signOut} size="icon" type="button" variant="ghost">
            <Logout className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
