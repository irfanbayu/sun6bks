type RateLimitPolicy = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtIso: string;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  headers: Headers;
  scope: string;
  path: string;
  policy: RateLimitPolicy;
};

type RateLimitResult = RateLimitDecision & {
  ip: string;
  userAgent: string;
};

type AntiFraudGlobal = typeof globalThis & {
  __antiFraudRateStore?: Map<string, RateLimitRecord>;
};

const SUSPICIOUS_USER_AGENT_REGEX =
  /(bot|crawler|spider|curl|wget|python|axios|node-fetch|postmanruntime|insomnia|selenium|playwright|puppeteer)/i;

const getGlobalStore = (): Map<string, RateLimitRecord> => {
  const antiFraudGlobal = globalThis as AntiFraudGlobal;
  if (!antiFraudGlobal.__antiFraudRateStore) {
    antiFraudGlobal.__antiFraudRateStore = new Map<string, RateLimitRecord>();
  }
  return antiFraudGlobal.__antiFraudRateStore;
};

const getClientIpFromHeaders = (headers: Headers): string => {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  return "unknown";
};

const getUserAgent = (headers: Headers): string => {
  return headers.get("user-agent")?.trim().toLowerCase() ?? "";
};

const buildRateLimitKey = (params: {
  scope: string;
  ip: string;
  userAgent: string;
  path: string;
}): string => {
  const normalizedPath = params.path.trim().toLowerCase();
  const uaFingerprint = params.userAgent.slice(0, 120);
  return `${params.scope}|${params.ip}|${uaFingerprint}|${normalizedPath}`;
};

const evaluateRateLimit = (
  key: string,
  policy: RateLimitPolicy,
): RateLimitDecision => {
  const store = getGlobalStore();
  const now = Date.now();
  const existingRecord = store.get(key);

  if (!existingRecord || now >= existingRecord.resetAt) {
    const resetAt = now + policy.windowMs;
    store.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: Math.max(policy.maxRequests - 1, 0),
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      resetAtIso: new Date(resetAt).toISOString(),
    };
  }

  const nextCount = existingRecord.count + 1;
  const updatedRecord: RateLimitRecord = {
    count: nextCount,
    resetAt: existingRecord.resetAt,
  };
  store.set(key, updatedRecord);

  const remaining = Math.max(policy.maxRequests - nextCount, 0);
  const retryAfterSeconds = Math.max(
    Math.ceil((existingRecord.resetAt - now) / 1000),
    1,
  );

  return {
    allowed: nextCount <= policy.maxRequests,
    limit: policy.maxRequests,
    remaining,
    retryAfterSeconds,
    resetAtIso: new Date(existingRecord.resetAt).toISOString(),
  };
};

const applyRateLimitToRequest = (input: RateLimitInput): RateLimitResult => {
  const ip = getClientIpFromHeaders(input.headers);
  const userAgent = getUserAgent(input.headers);
  const key = buildRateLimitKey({
    scope: input.scope,
    ip,
    userAgent,
    path: input.path,
  });
  const decision = evaluateRateLimit(key, input.policy);

  return {
    ...decision,
    ip,
    userAgent,
  };
};

const isSuspiciousBotUserAgent = (userAgent: string): boolean => {
  if (!userAgent) return true;
  return SUSPICIOUS_USER_AGENT_REGEX.test(userAgent);
};

export {
  applyRateLimitToRequest,
  getClientIpFromHeaders,
  getUserAgent,
  isSuspiciousBotUserAgent,
};
export type { RateLimitPolicy, RateLimitResult };
