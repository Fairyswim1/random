import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getTeacherAuthCookieMaxAge,
  getTeacherAuthCookieName,
  getTeacherAuthToken,
  verifyTeacherAuthToken,
  verifyTeacherPassword,
} from "@/lib/teacherAuth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getTeacherAuthCookieName())?.value;
  const authenticated = await verifyTeacherAuthToken(token);
  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  if (!process.env.TEACHER_PASSWORD) {
    return NextResponse.json(
      { error: "서버에 TEACHER_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!(await verifyTeacherPassword(password))) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await getTeacherAuthToken();
  if (!token) {
    return NextResponse.json({ error: "인증 설정 오류" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getTeacherAuthCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getTeacherAuthCookieMaxAge(),
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getTeacherAuthCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
