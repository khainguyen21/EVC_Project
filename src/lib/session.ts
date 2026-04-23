import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

// Called by middleware/pages to check if user is logged in
export async function verifySession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const payload = await decrypt(cookie)

  if (!payload) {
    redirect('/admin/login')
  }

  return { isAdmin: true }
}
