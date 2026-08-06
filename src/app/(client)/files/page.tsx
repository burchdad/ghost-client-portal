import Link from "next/link";
import { Download, FileText, FolderOpen, UploadCloud } from "lucide-react";
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

export default async function FilesPage() {
  const { organization } = await requireClientWorkspace();
  const files = await getDb().fileAsset.findMany({
    where: {
      organizationId: organization.id,
      deletedAt: null,
      visibility: "CLIENT_VISIBLE",
    },
    include: { project: true, onboardingForm: { include: { template: true } } },
    orderBy: { createdAt: "desc" },
  });
  const projectFiles = files.filter((file) => file.projectId);
  const onboardingFiles = files.filter((file) => file.onboardingFormId);
  const totalBytes = files.reduce((total, file) => total + file.sizeBytes, 0);

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="File vault"
        title={`Secure files for ${organization.name}`}
        body="Shared references, proposal assets, exports, deliverables, and client-visible uploads collect in one scoped workspace library."
        actions={
          <Link
            href="/requests?type=file"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
          >
            <UploadCloud size={16} aria-hidden />
            Request upload or file
          </Link>
        }
        metrics={[
          {
            label: "Files",
            value: String(files.length),
            detail: "Published assets",
          },
          {
            label: "Projects",
            value: String(projectFiles.length),
            detail: "Attached files",
          },
          {
            label: "Library size",
            value: formatBytes(totalBytes),
            detail: "Client-visible",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Project files"
          value={String(projectFiles.length)}
          detail="Assets tied to an active workspace."
          tone="accent"
        />
        <MetricCard
          label="Onboarding"
          value={String(onboardingFiles.length)}
          detail="Files captured through intake forms."
        />
        <MetricCard
          label="Access"
          value="Scoped"
          detail="Only client-visible files are listed here."
        />
      </section>

      {files.length ? (
        <SectionPanel title="Published files" eyebrow="Client-visible library">
          <div className="grid gap-3">
            {files.map((file) => (
              <article
                key={file.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="hidden rounded-md border border-accent/30 bg-accent/10 p-2 text-accent sm:block">
                      <FileText size={20} aria-hidden />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge>{humanizeEnum(file.category)}</StatusBadge>
                        <StatusBadge tone="accent">Client visible</StatusBadge>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">
                        {file.name}
                      </h2>
                      <p className="mt-2 text-sm text-muted">
                        {file.project?.name ??
                          file.onboardingForm?.template.name ??
                          (file.onboardingForm ? "Onboarding form" : null) ??
                          organization.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {file.mimeType} - {formatBytes(file.sizeBytes)} -{" "}
                        {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/requests?type=file"
                      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                    >
                      <Download size={15} aria-hidden />
                      Request access
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionPanel>
      ) : (
        <EmptyWorkspace
          icon={FolderOpen}
          title="No files have been published yet"
          body="When Ghost shares research, documents, summaries, exports, or final deliverables, they will appear here with client-safe access."
          steps={[
            "Ghost publishes a client-visible file",
            "The asset appears in this library",
            "Project and proposal files stay organized",
          ]}
        />
      )}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}
