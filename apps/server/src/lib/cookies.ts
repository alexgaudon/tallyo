const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Build a Set-Cookie header string with secure defaults.
 */
export function buildCookieString(
  name: string,
  value: string,
  maxAge: number,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict";
  } = {},
): string {
  const parts = [`${name}=${value}`, `Path=/`, `Max-Age=${maxAge}`];
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false && IS_PROD) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite || "Lax"}`);
  return parts.join("; ");
}

/** Set-Cookie string that clears a cookie (max-age=0). */
export function clearCookieString(name: string): string {
  return buildCookieString(name, "", 0);
}

/** Set-Cookie string for the session cookie (30-day expiry). */
export function sessionCookieString(token: string): string {
  return buildCookieString("session", token, 30 * 24 * 60 * 60);
}

/**
 * Parse a cookie value from cookie header by name
 */
export function parseCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${name}=`)) {
      const value = trimmed.substring(name.length + 1); // name.length + "=".length
      return value || null;
    }
  }
  return null;
}

/**
 * Parse session token from cookie header
 */
export function parseSessionToken(
  cookieHeader: string | undefined,
): string | null {
  return parseCookie(cookieHeader, "session");
}
