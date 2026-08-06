import { ClipboardList, LifeBuoy, Send } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate, humanizeEnum } from "@/lib/format";
import { createSupportRequestAction } from "./actions";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string; type?: string }>;
}) {
  const { organization } = await requireClientWorkspace();
  const message = (await searchParams) ?? {};
  const requestDefaults = getRequestDefaults(message.type);
  const requests = await getDb().supportRequest.findMany({
    where: { organizationId: organization.id },
    include: { updates: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const openRequests = requests.filter(
    (request) => !["COMPLETED", "CLOSED"].includes(request.status),
  );
  const urgentRequests = openRequests.filter(
    (request) => request.priority === "URGENT" || request.priority === "HIGH",
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Request desk"
        title={`Ask Ghost from ${organization.name}`}
        body="Submit service requests, support questions, content edits, billing questions, and project asks without losing context in email threads."
        metrics={[
          {
            label: "Open",
            value: String(openRequests.length),
            detail: "Active requests",
          },
          {
            label: "Priority",
            value: String(urgentRequests.length),
            detail: "High or urgent",
          },
          { label: "Routing", value: "Ghost", detail: "Workspace team" },
        ]}
      />

      {message.error || message.notice ? (
        <p
          className={
            message.error
              ? "rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              : "rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent"
          }
        >
          {message.error ?? message.notice}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Open requests"
          value={String(openRequests.length)}
          detail="Requests Ghost has not closed yet."
          tone={openRequests.length ? "warning" : "accent"}
        />
        <MetricCard
          label="Completed"
          value={String(requests.length - openRequests.length)}
          detail="Closed or completed request records."
        />
        <MetricCard
          label="Response path"
          value="Portal"
          detail="Updates stay attached to your workspace."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1fr]">
        <SectionPanel title="New request" eyebrow="Ask Ghost">
          <form action={createSupportRequestAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm text-muted"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
                  defaultValue={requestDefaults.category}
                >
                  <option value="GENERAL_QUESTION">General question</option>
                  <option value="MARKETING_REQUEST">Marketing request</option>
                  <option value="CONTENT_UPDATE">Content update</option>
                  <option value="WEBSITE_EDIT">Website edit</option>
                  <option value="DESIGN_REVISION">Design revision</option>
                  <option value="NEW_FEATURE">New feature</option>
                  <option value="BILLING_QUESTION">Billing question</option>
                  <option value="TECHNICAL_ISSUE">Technical issue</option>
                  <option value="URGENT_ISSUE">Urgent issue</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block text-sm text-muted"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
                  defaultValue={requestDefaults.priority}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm text-muted"
              >
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                required
                maxLength={120}
                defaultValue={requestDefaults.subject}
                placeholder="Example: Update homepage service copy"
                className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm text-muted"
              >
                Details
              </label>
              <textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={2000}
                defaultValue={requestDefaults.description}
                placeholder="Add context, links, desired timing, and what a good outcome looks like."
                className="min-h-36 w-full rounded-md border border-line bg-background px-3 py-3 text-sm leading-6"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
              <Send size={16} aria-hidden />
              Submit request
            </button>
          </form>
        </SectionPanel>

        <SectionPanel title="Request history" eyebrow="Workspace support">
          {requests.length ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-md border border-line bg-white/[0.035] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          tone={
                            request.status === "COMPLETED" ||
                            request.status === "CLOSED"
                              ? "accent"
                              : request.priority === "URGENT" ||
                                  request.priority === "HIGH"
                                ? "warning"
                                : "default"
                          }
                        >
                          {humanizeEnum(request.status)}
                        </StatusBadge>
                        <StatusBadge>
                          {humanizeEnum(request.category)}
                        </StatusBadge>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">
                        {request.subject}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {request.description}
                      </p>
                      {request.updates[0] ? (
                        <p className="mt-3 rounded-md bg-black/15 p-3 text-sm text-muted">
                          Latest update: {request.updates[0].body}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted">
                      {formatDate(request.updatedAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyWorkspace
              icon={ClipboardList}
              title="No requests are currently open"
              body="Requests give clients a direct place to track asks without losing context in email or chat threads."
              steps={[
                "Submit the request",
                "Ghost routes the owner",
                "Status and follow-up stay visible",
              ]}
            />
          )}
        </SectionPanel>
      </section>

      <SectionPanel title="Good requests include" eyebrow="Routing tips">
        <div className="grid gap-3 md:grid-cols-3">
          {["What needs to change", "Where it lives", "When it matters"].map(
            (tip) => (
              <div
                key={tip}
                className="rounded-md border border-line bg-black/10 p-4"
              >
                <LifeBuoy size={18} className="text-accent" aria-hidden />
                <p className="mt-3 font-semibold">{tip}</p>
              </div>
            ),
          )}
        </div>
      </SectionPanel>
    </section>
  );
}

function getRequestDefaults(type?: string) {
  if (type === "file") {
    return {
      category: "GENERAL_QUESTION",
      priority: "NORMAL",
      subject: "File or upload request",
      description:
        "I need help accessing, uploading, or requesting a workspace file.",
    };
  }

  if (type === "billing") {
    return {
      category: "BILLING_QUESTION",
      priority: "NORMAL",
      subject: "Billing question",
      description:
        "I have a question about a payment, invoice, receipt, or billing milestone.",
    };
  }

  return {
    category: "GENERAL_QUESTION",
    priority: "NORMAL",
    subject: "",
    description: "",
  };
}
