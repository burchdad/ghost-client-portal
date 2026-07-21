import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="surface grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel/85 p-6 shadow-2xl shadow-black/30">
        <Link href="/" className="text-sm uppercase tracking-[0.24em] text-accent">
          Ghost AI Solutions
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Secure portal login</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Access proposals, payments, projects, onboarding, and client-visible deliverables.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <div className="mt-5 flex justify-between text-sm text-muted">
          <Link href="/forgot-password" className="hover:text-foreground">
            Forgot password
          </Link>
          <Link href="/invite/sample-token" className="hover:text-foreground">
            Have an invite?
          </Link>
        </div>
      </section>
    </main>
  );
}
