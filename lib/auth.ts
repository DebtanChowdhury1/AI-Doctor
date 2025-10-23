import { auth, currentUser } from "@clerk/nextjs/server";
import { redirectToSignIn } from "@clerk/nextjs";

export async function requireAuth() {
  const { userId } = auth();

  if (!userId) {
    redirectToSignIn();
  }

  const user = await currentUser();

  if (!user) {
    redirectToSignIn();
  }

  return { userId, user };
}
