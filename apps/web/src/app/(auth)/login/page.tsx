import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <AuthCard title="Sign in" subtitle="Use your Arutech company email.">
      <LoginForm redirectTo={next && next.startsWith("/") ? next : "/dashboard"} />
    </AuthCard>
  );
}
