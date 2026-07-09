import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth/adminSession";

const SESSION_COOKIE = "admin_session";
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifyAdminSessionToken(token);

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
