import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIES,
  verifySessionToken,
  type AdminSessionPayload,
  type MemberSessionPayload,
} from "@/lib/session";

// Route protection lives here (Edge runtime) rather than in each
// page/route, so a new admin page or API route is protected by
// default just by living under /admin or /api/admin — nobody has
// to remember to add a check inside it.

const ADMIN_PUBLIC_PATHS = ["/admin/login"];
const ADMIN_API_PUBLIC_PATHS = ["/api/admin/login", "/api/admin/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !ADMIN_PUBLIC_PATHS.includes(pathname)) {
    const token = request.cookies.get(SESSION_COOKIES.admin)?.value;
    const session = token
      ? await verifySessionToken<AdminSessionPayload>(token)
      : null;
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (
    pathname.startsWith("/api/admin") &&
    !ADMIN_API_PUBLIC_PATHS.includes(pathname)
  ) {
    const token = request.cookies.get(SESSION_COOKIES.admin)?.value;
    const session = token
      ? await verifySessionToken<AdminSessionPayload>(token)
      : null;
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/api/member")) {
    const token = request.cookies.get(SESSION_COOKIES.member)?.value;
    const session = token
      ? await verifySessionToken<MemberSessionPayload>(token)
      : null;
    if (!session || session.role !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIES.member)?.value;
    const session = token
      ? await verifySessionToken<MemberSessionPayload>(token)
      : null;
    if (!session || session.role !== "member") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/member/:path*", "/dashboard/:path*"],
};
