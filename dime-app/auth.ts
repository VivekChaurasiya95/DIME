import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";
import { getFirebaseAdminAuth } from "./src/lib/firebase-admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, ...message) {
      console.error("NEXTAUTH_ERROR", code, ...message);
    },
    warn(code, ...message) {
      console.warn("NEXTAUTH_WARN", code, ...message);
    },
  },
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "firebase-google",
      name: "Firebase Google",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken =
          typeof credentials?.idToken === "string" ? credentials.idToken : "";

        if (!idToken) {
          return null;
        }

        try {
          const decodedToken =
            await getFirebaseAdminAuth().verifyIdToken(idToken);
          const email = decodedToken.email?.trim().toLowerCase();
          const firebaseUid = decodedToken.uid?.trim();

          if (!email || !firebaseUid) {
            return null;
          }

          const user = await prisma.user.upsert({
            where: { email },
            update: {
              name: decodedToken.name ?? undefined,
              image: decodedToken.picture ?? undefined,
              emailVerified: decodedToken.email_verified
                ? new Date()
                : undefined,
            },
            create: {
              email,
              name: decodedToken.name ?? email.split("@")[0],
              image: decodedToken.picture,
              emailVerified: decodedToken.email_verified ? new Date() : null,
            },
          });

          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "firebase",
                providerAccountId: firebaseUid,
              },
            },
            update: {
              userId: user.id,
              type: "oauth",
            },
            create: {
              userId: user.id,
              type: "oauth",
              provider: "firebase",
              providerAccountId: firebaseUid,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? undefined,
          };
        } catch (error) {
          console.error("FIREBASE_AUTH_ERROR", error);
          return null;
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = String(credentials.email).trim().toLowerCase();
        const rawPassword = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          rawPassword,
          user.password,
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
