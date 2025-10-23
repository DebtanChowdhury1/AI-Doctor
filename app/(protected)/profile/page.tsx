import { requireAuth } from "@/lib/auth";
import ProfileClient from "./client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireAuth();
  return <ProfileClient />;
}
