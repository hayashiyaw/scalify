import { headers } from "next/headers";

/**
 * Returns a client IP only when TRUST_PROXY is enabled, indicating the app
 * runs behind a trusted reverse proxy that sets x-forwarded-for / x-real-ip.
 * Without that, those headers are spoofable and must not drive rate limits.
 */
export async function getTrustedClientIp(): Promise<string | null> {
  if (process.env.TRUST_PROXY !== "true") {
    return null;
  }

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return headerList.get("x-real-ip")?.trim() ?? null;
}
