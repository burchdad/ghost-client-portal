import { acceptInvitationAction } from "./actions";
import { getInvitationByToken } from "@/server/invitations/service";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
        <form action={acceptInvitationAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={invitation.email}
          />
          <Field label="Name" name="name" defaultValue={invitation.name} />
          <Field label="Create password" name="password" type="password" />
          <label className="flex gap-3 rounded-md border border-line p-3 text-sm text-muted">
            <input
              name="acceptedTerms"
              type="checkbox"
              value="yes"
              required
              className="mt-1"
            />
            <span>
              I accept the Ghost AI Solutions client portal terms and understand
              this invitation is for my organization only.
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3"
      />
    </label>
  );
}
