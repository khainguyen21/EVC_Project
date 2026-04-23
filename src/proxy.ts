import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

// LESSON: proxy.ts (previously middleware.ts in Next.js < 16) is a special Next.js
// file that intercepts every request BEFORE the page renders.
// Next.js 16 renamed it to "proxy" to better reflect its purpose.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page itself to pass through (otherwise we'd have an infinite redirect loop!)
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // For all other /admin routes, check the session cookie
  if (pathname.startsWith('/admin')) {
    const cookie = request.cookies.get('session')?.value
    const session = await decrypt(cookie)

    // LESSON: If there is no valid session, we redirect to the login page.
    // The user never even sees the /admin page — they get bounced immediately.
    if (!session) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Everything else (public pages like /) passes through freely
  return NextResponse.next()
}

// LESSON: The config tells Next.js which paths this middleware should run on.
// We exclude static files and Next.js internals for performance.
export const config = {
  // '/admin' matches the root admin page, '/admin/:path*' matches all sub-routes
  matcher: ['/admin', '/admin/:path*'],
}
