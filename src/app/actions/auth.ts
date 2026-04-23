'use server'

import { createSession, deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'

// LESSON: 'use server' marks this entire file as Server Actions.
// Functions here ONLY run on the server — the browser never sees this code.
// This is why it's safe to check passwords here!

export async function login(
  prevState: { error: string } | undefined,
  formData: FormData
) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // LESSON: We compare against environment variables, NOT a database.
  // For a single-user admin panel, this is perfectly secure and much simpler.
  const validUsername = process.env.ADMIN_USERNAME
  const validPassword = process.env.ADMIN_PASSWORD

  if (username !== validUsername || password !== validPassword) {
    // Return an error message to display on the login form
    return { error: 'Invalid username or password.' }
  }

  // Credentials are correct — create the session cookie and redirect
  await createSession()
  redirect('/admin')
}

export async function logout() {
  await deleteSession()
  redirect('/admin/login')
}
