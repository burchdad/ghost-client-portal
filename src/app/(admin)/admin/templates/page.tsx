import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminTemplatesPage() {
  await requireInternalRole();
  const templates = await getDb().proposalTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Templates</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h2 className="font-semibold">{template.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {template.serviceCategory}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
