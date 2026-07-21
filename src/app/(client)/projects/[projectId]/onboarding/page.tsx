import Link from "next/link";
import { requireProjectAccess } from "@/lib/auth/guards";
import { getProjectOnboardingWorkspace } from "@/server/onboarding/service";
import { saveOnboardingDraftAction, submitOnboardingAction } from "./actions";

export default async function ProjectOnboardingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, organization } = await requireProjectAccess(projectId);
  const onboarding = await getProjectOnboardingWorkspace(
    project.id,
    organization.id,
  );

  if (!onboarding) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        <h1 className="text-3xl font-semibold">Onboarding is not ready yet</h1>
        <p className="mt-3 text-sm text-muted">
          Ghost will prepare onboarding after project activation.
        </p>
      </section>
    );
  }

  const responses = new Map(
    onboarding.responses.map((response) => [response.fieldKey, response.value]),
  );

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm text-accent">{organization.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">Logo Rebrand Onboarding</h1>
        <p className="mt-3 text-sm text-muted">
          {onboarding.template.instructions}
        </p>
        <div className="mt-5 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-accent"
            style={{ width: `${onboarding.completionPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {onboarding.completionPercentage}% complete
        </p>
      </div>

      <form className="space-y-5" encType="multipart/form-data">
        <input type="hidden" name="projectId" value={project.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          {onboarding.template.questions.map((question) => (
            <label
              key={question.id}
              className="rounded-lg border border-line bg-panel p-4"
            >
              <span className="text-sm font-medium">
                {question.prompt}
                {question.required ? (
                  <span className="text-accent"> *</span>
                ) : null}
              </span>
              <Field
                question={question}
                value={responses.get(question.fieldKey)}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            formAction={saveOnboardingDraftAction}
            className="rounded-md border border-line px-4 py-3 text-sm"
          >
            Save Draft
          </button>
          <button
            formAction={submitOnboardingAction}
            className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Submit Onboarding
          </button>
          <Link
            href={`/projects/${project.id}`}
            className="rounded-md border border-line px-4 py-3 text-center text-sm"
          >
            Return to Workspace
          </Link>
        </div>
      </form>
    </section>
  );
}

function Field({
  question,
  value,
}: {
  question: { fieldKey: string; fieldType: string };
  value: unknown;
}) {
  const textValue = typeof value === "string" ? value : "";

  if (question.fieldType === "file") {
    return (
      <input
        name={question.fieldKey}
        type="file"
        multiple
        className="mt-3 block w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
      />
    );
  }

  if (question.fieldType === "text") {
    return (
      <input
        name={question.fieldKey}
        defaultValue={textValue}
        className="mt-3 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-sm"
      />
    );
  }

  return (
    <textarea
      name={question.fieldKey}
      defaultValue={textValue}
      rows={4}
      className="mt-3 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-sm"
    />
  );
}
