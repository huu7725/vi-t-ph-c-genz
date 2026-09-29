const defaultFrontend = "http://localhost:5173,http://127.0.0.1:5173";

/** Expand only the two local development hosts, preserving protocol and port.
 * Production accepts only origins explicitly configured by the operator.
 * Never derive allowed origins from untrusted forwarded request headers.
 */
export function frontendOrigins(
  configured = process.env.FRONTEND_URL || defaultFrontend,
  production = process.env.NODE_ENV === "production",
): string[] {
  const origins = new Set<string>();
  for (const value of configured.split(",").map(s => s.trim()).filter(Boolean)) {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("FRONTEND_URL phải là địa chỉ origin HTTP(S), không gồm đường dẫn hoặc thông tin đăng nhập.");
    }
    origins.add(url.origin);
    if (!production && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      const alias = new URL(url.origin);
      alias.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
      origins.add(alias.origin);
    }
  }
  return [...origins];
}
