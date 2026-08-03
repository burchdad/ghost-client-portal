import { redirect } from "next/navigation";
import { requireInternalRole } from "@/lib/auth/guards";

export default async function AdminVegaPage() {
  await requireInternalRole();
  redirect("/vega");
}
