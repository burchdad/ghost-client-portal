import type { OrganizationRole } from "@prisma/client";
import {
  MailPlus,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import {
  EmptyWorkspace,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate, humanizeEnum } from "@/lib/format";
import {
  createTeamInvitationAction,
  revokeTeamInvitationAction,
} from "./actions";

const roleOptions: Array<{
  value: OrganizationRole;
  label: string;
  description: string;
}> = [
  {
    value: "PROJECT_CONTRIBUTOR",
    label: "Team contributor",
    description: "Can use Vega, GEO, Echo, projects, messages, and files.",
  },
  {
    value: "PROJECT_APPROVER",
    label: "Project approver",
    description: "Contributor access plus proposal and project decisions.",
  },
  {
    value: "BILLING_ADMINISTRATOR",
    label: "Billing administrator",
    description: "Can review payments and billing records.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only style access to client workspace context.",
  },
  {
    value: "OWNER",
    label: "Owner",
    description: "Full workspace administration, including team invites.",
  },
];

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string; invite?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const { organization, membership } = await requireClientWorkspace();
  const [members, invitations] = await Promise.all([
    getDb().organizationMembership.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    getDb().invitation.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const pendingInvitations = invitations.filter(
    (invite) =>
      !invite.acceptedAt && !invite.revokedAt && invite.expiresAt > new Date(),
  );
  const isOwner = membership.role === "OWNER";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = query.invite ? `${appUrl}/invite/${query.invite}` : null;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Team access"
        title={`Client team for ${organization.name}`}
        body="Invite employees into this Ghost AI workspace so they can run Vega lead searches, review GEO visibility work, coordinate Echo tactics, and manage project communication."
        metrics={[
          {
            label: "Your role",
            value: humanizeEnum(membership.role),
            detail: "Current access",
          },
          {
            label: "Members",
            value: String(members.length),
            detail: "Active workspace users",
          },
          {
            label: "Pending",
            value: String(pendingInvitations.length),
            detail: "Open invitations",
          },
        ]}
      />

      {query.notice ? (
        <p className="rounded-md border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-accent">
          {query.notice}
        </p>
      ) : null}
      {query.error ? (
        <p className="rounded-md border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {query.error}
        </p>
      ) : null}
      {inviteUrl ? (
        <SectionPanel
          title="Activation link"
          eyebrow="Copy fallback"
          aside={<StatusBadge tone="warning">Visible once</StatusBadge>}
        >
          <p className="text-sm leading-6 text-muted">
            Email delivery was attempted. Keep this link until the employee
            confirms access.
          </p>
          <p className="mt-3 break-all rounded-md border border-line bg-black/20 p-3 font-mono text-sm">
            {inviteUrl}
          </p>
        </SectionPanel>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionPanel
          title="Invite employee"
          eyebrow="Workspace activation"
          aside={
            <StatusBadge tone={isOwner ? "accent" : "warning"}>
              {isOwner ? "Owner only" : "Locked"}
            </StatusBadge>
          }
        >
          {isOwner ? (
            <form action={createTeamInvitationAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Employee name" name="name" />
                <Field label="Employee email" name="email" type="email" />
              </div>
              <label className="block">
                <span className="text-sm text-muted">Access role</span>
                <select
                  name="role"
                  defaultValue="PROJECT_CONTRIBUTOR"
                  className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2">
                {roleOptions.map((role) => (
                  <div
                    key={role.value}
                    className="rounded-md border border-line bg-white/[0.035] p-3"
                  >
                    <p className="text-sm font-semibold">{role.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {role.description}
                    </p>
                  </div>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-[var(--accent-strong)]">
                <MailPlus size={16} aria-hidden />
                Send invitation
              </button>
            </form>
          ) : (
            <EmptyWorkspace
              icon={ShieldCheck}
              title="Owner access required"
              body="Ask a workspace owner to invite employees or change team access."
              steps={[
                "Owners manage invitations",
                "Roles scope workspace access",
                "Employees activate by email link",
              ]}
            />
          )}
        </SectionPanel>

        <SectionPanel title="Active members" eyebrow="Workspace users">
          <div className="divide-y divide-line rounded-md border border-line">
            {members.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
                    <UserRoundCheck size={18} aria-hidden />
                  </div>
                  <div>
                    <h2 className="font-semibold">{member.user.name}</h2>
                    <p className="text-sm text-muted">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge
                    tone={member.role === "OWNER" ? "accent" : "default"}
                  >
                    {humanizeEnum(member.role)}
                  </StatusBadge>
                  <span className="text-xs text-muted">
                    Joined {formatDate(member.createdAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </SectionPanel>
      </section>

      <SectionPanel title="Invitations" eyebrow="Activation queue">
        {invitations.length ? (
          <div className="divide-y divide-line rounded-md border border-line">
            {invitations.map((invite) => {
              const status = invite.acceptedAt
                ? "accepted"
                : invite.revokedAt
                  ? "revoked"
                  : invite.expiresAt <= new Date()
                    ? "expired"
                    : "pending";

              return (
                <article
                  key={invite.id}
                  className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        tone={
                          status === "accepted"
                            ? "accent"
                            : status === "pending"
                              ? "warning"
                              : "default"
                        }
                      >
                        {status}
                      </StatusBadge>
                      <StatusBadge>
                        {humanizeEnum(invite.intendedRole)}
                      </StatusBadge>
                    </div>
                    <h2 className="mt-3 font-semibold">{invite.name}</h2>
                    <p className="mt-1 text-sm text-muted">{invite.email}</p>
                    <p className="mt-1 text-xs text-muted">
                      Created {formatDate(invite.createdAt)} - Expires{" "}
                      {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  {isOwner && status === "pending" ? (
                    <form action={revokeTeamInvitationAction}>
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invite.id}
                      />
                      <button className="rounded-md border border-line px-3 py-2 text-sm hover:border-red-300 hover:text-red-100">
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyWorkspace
            icon={UsersRound}
            title="No invitations yet"
            body="Send the first employee invitation to start running Vega leads through this workspace."
            steps={[
              "Invite by email",
              "Employee creates a password",
              "Access appears in this roster",
            ]}
          />
        )}
      </SectionPanel>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3"
      />
    </label>
  );
}
