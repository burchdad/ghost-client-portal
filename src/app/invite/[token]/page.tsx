import { acceptInvitationAction } from "./actions";
import { getInvitationByToken } from "@/server/invitations/service";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const invitation = await getInvitationByToken(token).catch(() => null);

  if (
    !invitation ||
    invitation.revokedAt ||
    invitation.acceptedAt ||
    invitation.expiresAt <= new Date()
  ) {
    return (
      <main className="surface grid min-h-screen place-items-center px-6 py-10">
        <section className="w-full max-w-lg rounded-lg border border-line bg-panel p-6">
          <h1 className="text-3xl font-semibold">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-muted">
            This invitation may have expired or already been used.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="surface grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-xl rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Ghost AI Solutions
        </p>
        <h1 className="mt-4 text-3xl font-semibold">
          Your client workspace is ready
        </h1>
        <p className="mt-3 text-sm text-muted">
          {invitation.name}, activate your workspace for{" "}
          {invitation.organization.name}.
        </p>
        {query.error ? (
          <div className="mt-4 rounded-md border border-red-300/40 bg-red-500/10 p-3 text-sm text-red-100">
            {query.error}
          </div>
        ) : null}
        <form action={acceptInvitationAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={invitation.email}
          />
          <Field label="Name" name="name" defaultValue={invitation.name} />
          <Field
            label="Create password"
            name="password"
            type="password"
            minLength={12}
            help="Use at least 12 characters."
          />
          <label className="flex gap-3 rounded-md border border-line p-3 text-sm text-muted">
            <input
              name="acceptedTerms"
              type="checkbox"
              value="yes"
              required
              className="mt-1"
            />
            <span>
              I accept the Ghost AI Solutions{" "}
              <a
                href="https://www.ghostai.solutions/terms"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://www.ghostai.solutions/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              , and understand this invitation is for my organization only.
            </span>
          </label>
          <button className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            Activate Workspace
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  minLength,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  minLength?: number;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        minLength={minLength}
        required
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3"
      />
      {help ? (
        <span className="mt-1 block text-xs text-muted">{help}</span>
      ) : null}
    </label>
  );
}
