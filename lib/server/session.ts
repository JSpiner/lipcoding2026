const SESSION_COOKIE_NAME = "malgrim_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

type SessionInfo = {
  sessionId: string;
  isNew: boolean;
};

export function resolveSessionFromRequest(request: Request): SessionInfo {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existing = readCookie(cookieHeader, SESSION_COOKIE_NAME);

  if (existing) {
    return { sessionId: existing, isNew: false };
  }

  return { sessionId: crypto.randomUUID(), isNew: true };
}

export function attachSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, sessionId: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

function readCookie(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const target = `${name}=`;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(target));

  if (!match) {
    return null;
  }

  const raw = match.slice(target.length);
  return raw ? decodeURIComponent(raw) : null;
}
