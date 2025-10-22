import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  publicRoutes: ["/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"]
});

export const config = {
  matcher: ["/(.*)", "/api/(.*)"]
};
