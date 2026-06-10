import { redirect } from "next/navigation";
import { AuthPanel } from "@/features/auth/auth-panel";
import { getCurrentSession } from "@/lib/auth";

type RegisterPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;

  return <AuthPanel callbackUrl={callbackUrl} mode="register" />;
}
