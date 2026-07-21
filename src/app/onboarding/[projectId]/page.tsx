import { requireProjectAccess } from "@/lib/auth/guards";

export default async function OnboardingEntryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { project, organization } = await requireProjectAccess((await params).projectId);

  return (
    <main className="surface min-h-screen px-5 py-10">
      <section className="mx-auto max-w-2xl rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Project onboarding</p>
        <h1 className="mt-4 text-3xl font-semibold">{project.name}</h1>
        <p className="mt-3 text-muted">
          {organization.name} has an onboarding record prepared after payment activation.
        </p>
      </section>
    </main>
  );
}
