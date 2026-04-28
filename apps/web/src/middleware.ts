import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register'];

/** Simple client-side token check. Real validation happens in AuthProvider. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, static files, API routes
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For dashboard routes — check if token cookie/header exists
  // We use localStorage on client, so middleware can only do a light check.
  // The actual auth guard is in the AuthProvider + dashboard layout.
  const token = request.cookies.get('accessToken')?.value;

  // If accessing auth pages while logged in — redirect to dashboard
  if (['/login', '/register'].includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
