import { Suspense } from "react";

import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ExpertModel from "@/models/Expert";
import ExpertsClient from "./client";

export const dynamic = "force-dynamic";

async function loadExperts(userId: string) {
  await connectToDatabase();
  const experts = await ExpertModel.find({ userId }).sort({ createdAt: -1 }).lean();

  return experts.map((expert) => ({
    id: expert._id.toString(),
    name: expert.name,
    prompt: expert.prompt,
    description: expert.description,
    icon: expert.icon,
    tone: expert.tone,
  }));
}

export default async function ExpertsPage() {
  const { userId } = await requireAuth();
  const experts = await loadExperts(userId);

  return (
    <Suspense>
      <ExpertsClient initialExperts={experts} />
    </Suspense>
  );
}
