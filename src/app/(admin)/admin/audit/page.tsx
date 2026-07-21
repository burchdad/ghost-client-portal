import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminAuditPage() {
  await requireInternalRole();
  const logs = await getDb().auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Security audit</h1>
      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <p className="font-medium">{log.eventType}</p>
            <p className="text-sm text-muted">{log.createdAt.toISOString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
