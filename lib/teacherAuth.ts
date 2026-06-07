const COOKIE_NAME = "teacher-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getTeacherAuthCookieName() {
  return COOKIE_NAME;
}

export function getTeacherAuthCookieMaxAge() {
  return COOKIE_MAX_AGE;
}

export async function getTeacherAuthToken(): Promise<string | null> {
  const password = process.env.TEACHER_PASSWORD;
  const secret = process.env.TEACHER_AUTH_SECRET ?? "change-me";
  if (!password) return null;
  return sha256Hex(`${password}:${secret}`);
}

export async function verifyTeacherPassword(password: string): Promise<boolean> {
  const expected = process.env.TEACHER_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function verifyTeacherAuthToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await getTeacherAuthToken();
  if (!expected) return false;
  return token === expected;
}
