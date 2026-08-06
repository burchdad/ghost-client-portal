import { MessagesSquare, Send } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { createMessageThreadAction } from "./actions";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    projectId?: string;
  }>;
}) {
  const message = await searchParams;
  const { organization } = await requireClientWorkspace();
  const [threads, projects] = await Promise.all([
    getDb().messageThread.findMany({
      where: { organizationId: organization.id },
      include: {
        project: true,
        messages: {
          where: { clientVisible: true },
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getDb().project.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        portalVisible: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const unreadMessages = threads.flatMap((thread) =>
    thread.messages.filter((item) => !item.readAt && !item.authorId),
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Workspace messages"
        title={`Message center for ${organization.name}`}
        body="Start client-safe conversations with Ghost, keep project questions attached to the right workspace, and review replies without losing context."
        metrics={[
          {
            label: "Threads",
            value: String(threads.length),
            detail: "Open conversations",
          },
          {
            label: "Unread",
            value: String(unreadMessages.length),
            detail: "Need response",
          },
          {
            label: "Projects",
            value: String(projects.length),
            detail: "Can be linked",
          },
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
          label="Open channel"
          value="Portal"
          detail="Messages stay scoped to this client workspace."
          tone="accent"
        />
        <MetricCard
          label="Project context"
          value={String(projects.length)}
          detail="Attach new messages to active workspaces."
        />
        <MetricCard
          label="Response state"
          value={unreadMessages.length ? "Needs review" : "Clear"}
          detail="Unread Ghost replies surface here."
          tone={unreadMessages.length ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1fr]">
        <SectionPanel title="Start a thread" eyebrow="Ask Ghost">
          <form action={createMessageThreadAction} className="space-y-4">
            <div>
              <label
                htmlFor="projectId"
                className="mb-2 block text-sm text-muted"
              >
                Project
              </label>
              <select
                id="projectId"
                name="projectId"
                className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
                defaultValue={
                  projects.some((project) => project.id === message.projectId)
                    ? message.projectId
                    : ""
                }
              >
                <option value="">General workspace question</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
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
                maxLength={140}
                placeholder="Example: Need launch copy reviewed"
                className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="body" className="mb-2 block text-sm text-muted">
                Message
              </label>
              <textarea
                id="body"
                name="body"
                required
                minLength={10}
                maxLength={2000}
                placeholder="Add context, links, desired timing, and what you need Ghost to decide or complete."
                className="min-h-36 w-full rounded-md border border-line bg-background px-3 py-3 text-sm leading-6"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
              <Send size={16} aria-hidden />
              Send message
            </button>
          </form>
        </SectionPanel>

        {threads.length ? (
          <SectionPanel title="Threads" eyebrow="Client-safe inbox">
            <div className="space-y-4">
              {threads.map((thread) => {
                const latestMessage = thread.messages.at(-1);

                return (
                  <article
                    key={thread.id}
                    className="rounded-md border border-line bg-white/[0.035] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <StatusBadge
                          tone={
                            latestMessage?.readAt || latestMessage?.authorId
                              ? "default"
                              : "accent"
                          }
                        >
                          {latestMessage?.readAt || latestMessage?.authorId
                            ? "Open"
                            : "Unread"}
                        </StatusBadge>
                        <h2 className="mt-3 text-xl font-semibold">
                          {thread.subject}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          {thread.project?.name ?? "General workspace"}
                        </p>
                      </div>
                      <p className="text-sm text-muted">
                        {formatDate(thread.createdAt)}
                      </p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {thread.messages.slice(-3).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border border-line bg-black/10 p-3"
                        >
                          <p className="text-xs uppercase tracking-[0.16em] text-muted">
                            {item.author?.name ?? "Ghost"} -{" "}
                            {formatDate(item.createdAt)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-foreground">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </SectionPanel>
        ) : (
          <EmptyWorkspace
            icon={MessagesSquare}
            title="No message threads are open right now"
            body="Start a thread when you need Ghost to review a decision, answer a project question, or capture context for the workspace."
            steps={[
              "Choose a project or general workspace",
              "Send the message through the portal",
              "Replies stay attached to this client account",
            ]}
          />
        )}
      </section>
    </section>
  );
}
