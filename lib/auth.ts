import { auth } from "@clerk/nextjs/server";

export function getAuthenticatedUser() {
  const { userId } = auth();

  if (!userId) {
    throw new Error("User is not authenticated");
  }

  return userId;
}
