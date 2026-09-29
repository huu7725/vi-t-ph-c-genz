import type { Look } from "../types";
export interface AccountSession {
  actorId: string;
  role: "guest" | "member";
  user: { id: string; name: string; email: string } | null;
  csrfToken: string;
  limits: { aiPerDay: number | null; lookbook: number };
  usage: {
    aiUsed: number;
    aiRemaining: number | null;
    lookbookCount: number;
    resetsAt: string;
    timezone: string;
  };
}
export interface AccountResponse {
  session: AccountSession;
  looks: Look[];
  added?: boolean;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public code = "NETWORK_ERROR",
    public status = 0,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  session?: AccountSession,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { "X-CSRF-Token": session.csrfToken } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Chưa kết nối được máy chủ. Vui lòng thử lại khi có kết nối.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.error || "Không thể thực hiện yêu cầu. Vui lòng thử lại.",
      data.code || "SERVER_ERROR",
      response.status,
    );
  return data as T;
}
// Share initial loading across StrictMode mounts, avoiding two guest cookies.
let bootstrap: Promise<AccountResponse> | undefined;
export function initialAccount() {
  bootstrap ??= api<AccountResponse>("/auth/session").finally(() => {
    bootstrap = undefined;
  });
  return bootstrap;
}
export function serializeLook(look: Look) {
  return {
    title: look.title,
    garmentId: look.garmentId,
    eventId: look.eventId,
    styleId: look.styleId,
    gender: look.gender,
    pattern: look.pattern,
    palette: look.palette,
    accessoryIds: look.accessoryIds,
    stylingReason: look.stylingReason,
    culturalFactIds: look.culturalFactIds,
    cautionRuleIds: look.cautionRuleIds,
    source: look.source,
  };
}
