import { redirect } from "next/navigation";
import { requireInternalRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminVegaPage() {
  await requireInternalRole();
  redirect("/vega");
}
