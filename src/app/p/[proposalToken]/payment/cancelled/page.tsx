import Link from "next/link";

export default async function PaymentCancelledPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;

  return (
    <main className="surface grid min-h-screen place-items-center px-5 py-10">
      <section className="max-w-xl rounded-lg border border-line bg-panel p-6 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Ghost AI Solutions</p>
        <h1 className="mt-4 text-4xl font-semibold">Payment was not completed</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Your proposal remains accepted. No charge is recorded from visiting this page unless Stripe separately confirms one through the secure webhook.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/p/${proposalToken}/payment`} className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            Return to Payment
          </Link>
          <a href={`/p/${proposalToken}/acceptance-summary`} className="rounded-md border border-line px-4 py-3 text-sm">
            Acceptance Summary
          </a>
        </div>
      </section>
    </main>
  );
}
