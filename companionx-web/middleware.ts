import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("laravel_session")?.value ??
    request.cookies.get("laravel-session")?.value;
  const isAuthenticated = Boolean(sessionCookie);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/register"],
};
