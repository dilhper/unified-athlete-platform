import { compare } from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { query } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Support both email and phone number login
        const identifier = credentials.email
        let result = await query(
          'SELECT id, email, phone, name, password_hash, avatar, role, email_verified FROM users WHERE email = $1 OR phone = $1',
          [identifier]
        )

        if (result.rowCount === 0 || !result.rows[0].password_hash) {
          console.warn('Auth failed: user not found or missing password hash', {
            identifier,
            hasRow: result.rowCount > 0,
          })
          return null
        }

        const user = result.rows[0]
        if (!user.email_verified) {
          console.warn('Auth failed: email not verified', { identifier })
          return null
        }

        const isValid = await compare(credentials.password, user.password_hash)
        if (!isValid) {
          console.warn('Auth failed: password mismatch', { identifier })
          return null
        }

        return {
          id: user.id,
          email: user.email || user.phone,
          name: user.name,
          image: user.avatar ?? undefined,
          role: user.role,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
}
