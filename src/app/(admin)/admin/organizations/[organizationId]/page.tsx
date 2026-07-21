import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import {
  createClientInvitationAction,
  updateOrganizationLifecycleAction,
} from "./actions";

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  await requireInternalRole();
  const query = await searchParams;
  const organization = await getDb().organization.findUnique({
    where: { id: (await params).organizationId },
    include: {
      primaryContact: true,
      billingContact: true,
      contacts: true,
      projects: true,
      proposals: true,
      payments: true,
      invitations: { orderBy: { createdAt: "desc" }, take: 5 },
      activity: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!organization) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        Organization not found.
      </section>
    );
  }
  const primary =
    organization.primaryContact ??
    organization.contacts.find((contact) => contact.isPrimary) ??
    organization.contacts[0];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <h1 className="text-3xl font-semibold">{organization.name}</h1>
        <p className="mt-3 text-sm text-muted">
          Client lifecycle operations for this organization.
        </p>
        <Link
          href={`/admin/organizations/${organization.id}/launch-readiness`}
          className="mt-4 inline-flex rounded-md border border-line px-4 py-3 text-sm"
        >
          Launch readiness
        </Link>
      </div>
      <form
        action={updateOrganizationLifecycleAction}
        className="rounded-lg border border-line bg-panel p-5"
      >
        <input type="hidden" name="organizationId" value={organization.id} />
        <h2 className="text-xl font-semibold">Client record cleanup</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Organization display name"
            name="name"
            defaultValue={organization.name}
          />
          <Field
            label="Primary contact name"
            name="primaryContactName"
            defaultValue={primary?.name ?? ""}
          />
          <Field
            label="Client title"
            name="primaryContactTitle"
            defaultValue={primary?.title ?? ""}
          />
          <Field
            label="Client email"
            name="primaryContactEmail"
            defaultValue={primary?.email ?? ""}
            type="email"
          />
          <Field
            label="Primary contact phone"
            name="primaryContactPhone"
            defaultValue={primary?.phone ?? ""}
          />
          <Field
            label="Preferred communication"
            name="preferredCommunicationMethod"
            defaultValue={primary?.preferredCommunicationMethod ?? ""}
          />
          <label className="flex items-start gap-3 rounded-md border border-line bg-white/[0.035] p-3 text-sm text-muted">
            <input
              type="checkbox"
              name="isPrimaryApprover"
              value="yes"
              defaultChecked={primary?.isPrimaryApprover ?? false}
              className="mt-1"
            />
            Primary approver
          </label>
          <Field
            label="Billing contact name"
            name="billingContactName"
            defaultValue={
              organization.billingContact?.name ?? primary?.name ?? ""
            }
          />
          <Field
            label="Billing contact email"
            name="billingContactEmail"
            defaultValue={
              organization.billingContact?.email ?? primary?.email ?? ""
            }
            type="email"
          />
          <label className="text-sm text-muted md:col-span-2">
            Audit reason
            <textarea
              name="reason"
              required
              minLength={10}
              className="mt-2 min-h-24 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          Save audited changes
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Projects" value={String(organization.projects.length)} />
        <Info label="Proposals" value={String(organization.proposals.length)} />
        <Info label="Payments" value={String(organization.payments.length)} />
        <Info
          label="Pending invitations"
          value={String(
            organization.invitations.filter(
              (invite) => !invite.acceptedAt && !invite.revokedAt,
            ).length,
          )}
        />
      </div>
      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Client invitation</h2>
        {query.invite ? (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm">
            <p className="font-medium text-accent">
              Copy this invitation link now
            </p>
            <p className="mt-2 break-all font-mono">/invite/{query.invite}</p>
            <p className="mt-2 text-muted">
              The full token is not stored and will not be shown again.
            </p>
          </div>
        ) : null}
        <form
          action={createClientInvitationAction}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="organizationId" value={organization.id} />
          <Field
            label="Client name"
            name="invitationName"
            defaultValue={primary?.name ?? ""}
          />
          <Field
            label="Client email"
            name="invitationEmail"
            defaultValue={primary?.email ?? ""}
            type="email"
          />
          <label className="text-sm text-muted">
            Role
            <select
              name="intendedRole"
              defaultValue="OWNER"
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            >
              <option value="OWNER">Owner</option>
              <option value="BILLING_ADMINISTRATOR">
                Billing administrator
              </option>
              <option value="PROJECT_APPROVER">Project approver</option>
              <option value="PROJECT_CONTRIBUTOR">Project contributor</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </label>
          <label className="text-sm text-muted md:col-span-2">
            Confirmation phrase
            <input
              name="confirmation"
              placeholder="CREATE REVIEWED INVITATION"
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            />
          </label>
          <button className="self-end rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            Create reviewed invitation link
          </button>
        </form>
      </div>
      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Recent client activity</h2>
        <div className="mt-4 space-y-2 text-sm text-muted">
          {organization.activity.length ? (
            organization.activity.map((item) => (
              <p key={item.id}>{item.title}</p>
            ))
          ) : (
            <p>No activity yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-sm text-muted">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
