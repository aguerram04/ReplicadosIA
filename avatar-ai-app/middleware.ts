import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard as logged-in (already in app), and /admin as admin-only
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(token as any).isAdmin) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Merge matchers in a single export to avoid redeclarations
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/create/:path*",
    "/api/protected/:path*",
  ],
};
