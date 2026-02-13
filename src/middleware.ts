import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protected routes require authentication
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isUserRoute = createRouteMatcher(["/user(.*)"]);

// Public routes (no auth needed)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/payment/(.*)",
  "/midtrans/callback",
  "/api/transactions/(.*)",
  "/api/cron/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) || isUserRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
