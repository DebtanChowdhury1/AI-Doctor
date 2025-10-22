import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  auth().protect();
});

export const config = {
  matcher: ["/(.*)", "/api/(.*)"]
};
