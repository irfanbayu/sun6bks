import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimitToRequest,
  getUserAgent,
  isSuspiciousBotUserAgent,
  type RateLimitPolicy,
} from "@/lib/security/anti-fraud";

const ONE_MINUTE_MS = 60_000;

// Protected routes require authentication
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isUserRoute = createRouteMatcher(["/user(.*)"]);

// Anti-fraud route scopes
const isCronReconcileRoute = createRouteMatcher(["/api/cron/reconcile"]);
const isTransactionsRoute = createRouteMatcher(["/api/transactions/(.*)"]);
const isInvoiceRoute = createRouteMatcher(["/api/user/orders/(.*)/invoice"]);
const isMidtransCallbackRoute = createRouteMatcher(["/midtrans/callback"]);
const isCheckinRoute = createRouteMatcher(["/api/admin/tickets/checkin"]);
const isCheckinSyncRoute = createRouteMatcher([
  "/api/admin/tickets/checkin/sync",
]);
const isCheckinSnapshotRoute = createRouteMatcher([
  "/api/admin/tickets/checkin/snapshot",
]);
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

const getRateLimitConfig = (
  request: NextRequest,
): { scope: string; policy: RateLimitPolicy } | null => {
  if (isCronReconcileRoute(request)) return null;

  if (isTransactionsRoute(request)) {
    return {
      scope: "transactions",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 45 },
    };
  }

  if (isInvoiceRoute(request)) {
    return {
      scope: "invoice",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 10 },
    };
  }

  if (isCheckinSyncRoute(request)) {
    return {
      scope: "checkin-sync",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 60 },
    };
  }

  if (isCheckinSnapshotRoute(request)) {
    return {
      scope: "checkin-snapshot",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 90 },
    };
  }

  if (isCheckinRoute(request)) {
    return {
      scope: "checkin",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 180 },
    };
  }

  if (isMidtransCallbackRoute(request)) {
    return {
      scope: "midtrans-callback",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 240 },
    };
  }

  if (isApiRoute(request)) {
    return {
      scope: "api-default",
      policy: { windowMs: ONE_MINUTE_MS, maxRequests: 120 },
    };
  }

  return null;
};

const shouldRunBotDetection = (request: Request): boolean => {
  if (isTransactionsRoute(request)) return true;
  if (isInvoiceRoute(request)) return true;
  return false;
};

const createTooManyRequestsResponse = (params: {
  scope: string;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtIso: string;
}): NextResponse => {
  const response = NextResponse.json(
    {
      error: "Too many requests",
      scope: params.scope,
      retryAfterSeconds: params.retryAfterSeconds,
      resetAt: params.resetAtIso,
    },
    { status: 429 },
  );

  response.headers.set("X-RateLimit-Limit", String(params.limit));
  response.headers.set("X-RateLimit-Remaining", String(params.remaining));
  response.headers.set("Retry-After", String(params.retryAfterSeconds));

  return response;
};

export default clerkMiddleware(async (auth, request) => {
  if (shouldRunBotDetection(request)) {
    const userAgent = getUserAgent(request.headers);
    if (isSuspiciousBotUserAgent(userAgent)) {
      return NextResponse.json(
        {
          error: "Suspicious client detected",
          reason: "user_agent_blocked",
        },
        { status: 403 },
      );
    }
  }

  const rateLimitConfig = getRateLimitConfig(request);
  if (rateLimitConfig) {
    const decision = applyRateLimitToRequest({
      headers: request.headers,
      scope: rateLimitConfig.scope,
      path: request.nextUrl.pathname,
      policy: rateLimitConfig.policy,
    });

    if (!decision.allowed) {
      return createTooManyRequestsResponse({
        scope: rateLimitConfig.scope,
        limit: decision.limit,
        remaining: decision.remaining,
        retryAfterSeconds: decision.retryAfterSeconds,
        resetAtIso: decision.resetAtIso,
      });
    }
  }

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
