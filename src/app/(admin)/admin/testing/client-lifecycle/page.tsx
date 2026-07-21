import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/format";
import {
  cleanupTestRunAction,
  createTestInvitationAction,
  createTestRunAction,
  sendTestInvitationAction,
  sendTestProposalAction,
} from "./actions";
import {
  CREATE_TEST_INVITATION_CONFIRMATION,
  DELETE_TEST_RUN_CONFIRMATION,
  SEND_TEST_INVITATION_CONFIRMATION,
  SEND_TEST_PROPOSAL_CONFIRMATION,
  getConfiguredTestClient,
  getLatestTestRun,
  invitationEmail,
  proposalEmail,
  testRunStatus,
} from "@/server/testing/client-lifecycle";

export default async function ClientLifecycleTestingPage({
  searchParams,
}: {
  searchParams: Promise<{
    proposalToken?: string;
    invitationToken?: string;
    created?: string;
  }>;
}) {
  await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const query = await searchParams;
  const client = getConfiguredTestClient();
  const run = await getLatestTestRun().catch(() => null);
  const proposal = run?.proposals[0] ?? null;
  const project = run?.projects[0] ?? null;
  const invitation =
    run?.invitations.find((item) => item.id === run.invitationId) ??
    run?.invitations[0] ??
    null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const proposalUrl = query.proposalToken
    ? `${appUrl}/p/${query.proposalToken}`
    : null;
  const invitationUrl = query.invitationToken
    ? `${appUrl}/invite/${query.invitationToken}`
    : null;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-amber-200/40 bg-panel p-6">
        <p className="text-sm font-semibold text-amber-100">TEST DATA ONLY</p>
        <h1 className="mt-2 text-3xl font-semibold">Lifecycle Testing</h1>
        <p className="mt-3 text-sm text-muted">
          Isolated fake-client workflow for {client.email}. Gray Matters records
          are not used by these actions.
        </p>
      </div>

      {query.proposalToken ? (
        <OneTime label="One-time test proposal URL" value={proposalUrl ?? ""} />
      ) : null}
      {query.invitationToken ? (
        <OneTime
          label="One-time test invitation URL"
          value={invitationUrl ?? ""}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Status" value={testRunStatus(run)} />
        <Info label="Test run" value={run?.id ?? "None"} />
        <Info
          label="Proposal email"
          value={run?.proposalEmailSentAt ? "Sent" : "Not sent"}
        />
        <Info label="Invitation" value={invitation?.status ?? "Not created"} />
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Create Fake Client</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Row label="Organization" value={client.organizationName} />
          <Row label="Recipient" value={`${client.name} <${client.email}>`} />
          <Row
            label="Proposal"
            value={proposal?.title ?? "Client Portal End-to-End Test Proposal"}
          />
          <Row
            label="Project"
            value={project?.name ?? "Test Brand Identity Project"}
          />
          <Row
            label="Total"
            value={
              proposal
                ? formatMoney(proposal.totalCents, proposal.currency)
                : "$100.00"
            }
          />
          <Row label="Deposit" value="$50.00" />
        </dl>
        <form
          action={createTestRunAction}
          className="mt-4 flex flex-wrap gap-3"
        >
          <button className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            Create or reuse test run
          </button>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="forceNew" value="yes" />
            Create a new run
          </label>
        </form>
      </div>

      {run && proposal ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={sendTestProposalAction}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h2 className="text-xl font-semibold">Send Test Proposal</h2>
            <Preview
              html={
                proposalEmail({
                  url: proposalUrl ?? `${appUrl}/p/[one-time-token]`,
                  testRunId: run.id,
                }).html
              }
            />
            <input type="hidden" name="testRunId" value={run.id} />
            <Field
              name="proposalToken"
              label="One-time proposal token"
              defaultValue={query.proposalToken ?? ""}
            />
            <Field
              name="confirmation"
              label="Confirmation"
              placeholder={SEND_TEST_PROPOSAL_CONFIRMATION}
            />
            <button className="mt-4 rounded-md border border-line px-4 py-3 text-sm">
              Send Test Proposal
            </button>
          </form>

          <form
            action={createTestInvitationAction}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h2 className="text-xl font-semibold">
              Create Reviewed Test Invitation
            </h2>
            <p className="mt-2 text-sm text-muted">
              Creates a reviewed invitation only. It does not send email.
            </p>
            <input type="hidden" name="testRunId" value={run.id} />
            <Field
              name="confirmation"
              label="Confirmation"
              placeholder={CREATE_TEST_INVITATION_CONFIRMATION}
            />
            <button className="mt-4 rounded-md border border-line px-4 py-3 text-sm">
              Create Test Invitation
            </button>
          </form>

          <form
            action={sendTestInvitationAction}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h2 className="text-xl font-semibold">Send Test Invitation</h2>
            <Preview
              html={
                invitationEmail({
                  url: invitationUrl ?? `${appUrl}/invite/[one-time-token]`,
                  testRunId: run.id,
                }).html
              }
            />
            <input type="hidden" name="testRunId" value={run.id} />
            <Field
              name="invitationToken"
              label="One-time invitation token"
              defaultValue={query.invitationToken ?? ""}
            />
            <Field
              name="confirmation"
              label="Confirmation"
              placeholder={SEND_TEST_INVITATION_CONFIRMATION}
            />
            <button className="mt-4 rounded-md border border-line px-4 py-3 text-sm">
              Send Test Invitation
            </button>
          </form>

          <form
            action={cleanupTestRunAction}
            className="rounded-lg border border-red-300/40 bg-panel p-5"
          >
            <h2 className="text-xl font-semibold">Cleanup Test Run</h2>
            <p className="mt-2 text-sm text-muted">
              Revokes tokens and archives marked test records. Refuses confirmed
              live payments.
            </p>
            <input type="hidden" name="testRunId" value={run.id} />
            <Field
              name="confirmation"
              label="Confirmation"
              placeholder={DELETE_TEST_RUN_CONFIRMATION}
            />
            <button className="mt-4 rounded-md border border-red-300/40 px-4 py-3 text-sm text-red-100">
              Cleanup Test Run
            </button>
          </form>
        </div>
      ) : null}

      {proposal ? (
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Related Records</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-md border border-line px-4 py-3"
              href={`/admin/proposals/${proposal.id}`}
            >
              Proposal
            </Link>
            {project ? (
              <Link
                className="rounded-md border border-line px-4 py-3"
                href={`/admin/projects/${project.id}`}
              >
                Project
              </Link>
            ) : null}
            {proposalUrl ? (
              <Link
                className="rounded-md border border-line px-4 py-3"
                href={proposalUrl}
              >
                Open proposal
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 break-all font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue = "",
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="mt-4 block text-sm text-muted">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}

function OneTime({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">
      <p className="font-medium text-accent">{label}</p>
      <p className="mt-2 break-all font-mono">{value}</p>
      <p className="mt-2 text-muted">
        This full token is shown only from this redirect.
      </p>
    </div>
  );
}

function Preview({ html }: { html: string }) {
  return (
    <div
      className="mt-3 rounded-md border border-line bg-white/[0.035] p-3 text-sm text-muted"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
