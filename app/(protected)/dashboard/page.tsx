import { requireAuth } from "@/lib/auth";
import DashboardClient from "./client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();
  return <DashboardClient />;
}
