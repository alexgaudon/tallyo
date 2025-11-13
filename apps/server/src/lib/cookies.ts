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
