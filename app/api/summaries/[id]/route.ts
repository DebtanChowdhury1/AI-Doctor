import { NextResponse } from "next/server";

import SummaryModel from "@/models/Summary";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const summary = await SummaryModel.findOneAndDelete({ _id: params.id, userId });
  if (!summary) {
    return NextResponse.json({ error: "Summary not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
