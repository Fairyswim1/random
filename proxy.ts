import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTeacherAuthCookieName, verifyTeacherAuthToken } from "@/lib/teacherAuth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/control-x7q9/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/control-x7q9")) {
    const token = request.cookies.get(getTeacherAuthCookieName())?.value;
    const isAuthed = await verifyTeacherAuthToken(token);
    if (!isAuthed) {
      const loginUrl = new URL("/control-x7q9/login", request.url);
      if (pathname !== "/control-x7q9") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/control-x7q9", "/control-x7q9/:path*"],
};
