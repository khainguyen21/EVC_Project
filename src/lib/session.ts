import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

// Encode the secret key into bytes that jose can use
function getEncodedKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set in .env')
  return new TextEncoder().encode(secret)
}

// LESSON: We encrypt the payload into a signed JWT string.
// "Signed" means if anyone tampers with the cookie, the signature won't match and we reject it.
export async function encrypt(payload: { isAdmin: boolean; expiresAt: Date }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getEncodedKey())
}

// LESSON: We decrypt and verify the JWT. If it was tampered with or expired, this throws.
export async function decrypt(session: string | undefined) {
  if (!session) return null
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    // Token is invalid or expired
    return null
  }
}

// Called after a successful login — creates the cookie in the browser
export async function createSession() {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const session = await encrypt({ isAdmin: true, expiresAt })
  const cookieStore = await cookies()

  // LESSON: httpOnly means JavaScript in the browser CANNOT read this cookie.
  // This protects against XSS attacks where malicious scripts try to steal cookies.
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // only HTTPS in production
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

// Called on logout — destroys the cookie
export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

// Reads the session cookie and returns its payload, or null when it is absent,
// tampered with, or expired. Most routes want requireAdmin() below instead.
export async function getSession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  return decrypt(cookie)
}

// LESSON: The guard every admin API route should use. It returns a response to
// send back (401) or null to continue.
//
// The earlier version of this called redirect('/admin/login'), which works on a
// page but not in a route handler: redirect() throws a special NEXT_REDIRECT
// error, and a route's `catch (error)` swallowed it into a 500 with a message
// like "Failed to update tutor". The browser saw a server error instead of
// "your session expired", so the admin panel showed nothing at all and the
// edit was lost. Returning a real 401 lets the client react properly.
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
