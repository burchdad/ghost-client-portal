import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="surface grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel/90 p-6 shadow-2xl shadow-black/30">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ghost-ai-logo.png"
            alt=""
            width={46}
            height={46}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-accent/30"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent">
              Ghost AI
            </p>
            <p className="font-semibold">Client Portal</p>
          </div>
        </Link>
        <div className="mt-6 rounded-md border border-accent/30 bg-accent/10 p-3 text-accent">
          <MailCheck size={18} aria-hidden />
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Enter your portal email and Ghost will send a secure reset link that
          expires in 30 minutes.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={15} aria-hidden />
          Back to login
        </Link>
      </section>
    </main>
  );
}
