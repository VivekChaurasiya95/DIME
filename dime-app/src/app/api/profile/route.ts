import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import {
  buildEmailChangeIdentifier,
  isValidEmail,
  normalizeEmail,
} from "@/lib/profile-email-verification";

type ProfilePayload = {
  name?: unknown;
  email?: unknown;
  image?: unknown;
  emailVerificationCode?: unknown;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const formatProviderLabel = (provider: string) => {
  if (provider === "firebase") {
    return "Google";
  }

  if (provider === "credentials") {
    return "Email and password";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
  accounts: Array<{
    provider: string;
    type: string;
  }>;
};

const buildProfileResponse = (user: ProfileRow) => {
  const signInMethods = Array.from(
    new Set(
      user.accounts.map((account) => formatProviderLabel(account.provider)),
    ),
  );

  if (signInMethods.length === 0) {
    signInMethods.push("Email and password");
  }

  const completionSignals = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.image),
    Boolean(user.emailVerified),
  ];

  const profileCompletion = Math.round(
    (completionSignals.filter(Boolean).length / completionSignals.length) * 100,
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    overview: {
      joinedAt: user.createdAt.toISOString(),
      lastUpdatedAt: user.updatedAt.toISOString(),
      isEmailVerified: Boolean(user.emailVerified),
      signInMethods,
      profileCompletion,
    },
  };
};

const requireSessionUserId = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
};

export async function GET() {
  try {
    const userId = await requireSessionUserId();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        accounts: {
          orderBy: { provider: "asc" },
          select: {
            provider: true,
            type: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(buildProfileResponse(user));
  } catch (error: unknown) {
    console.error("PROFILE_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireSessionUserId();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ProfilePayload;

    const name = normalizeString(body.name);
    const email = normalizeEmail(body.email);
    const image = normalizeString(body.image);
    const emailVerificationCode = normalizeString(body.emailVerificationCode);

    if (name.length < 2) {
      return new NextResponse("Name must be at least 2 characters", {
        status: 400,
      });
    }

    if (!email || !isValidEmail(email)) {
      return new NextResponse("Please enter a valid email address", {
        status: 400,
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });

    if (!currentUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    const currentEmail = normalizeEmail(currentUser.email);
    const isEmailChanged = email !== currentEmail;

    if (isEmailChanged) {
      if (!/^\d{6}$/.test(emailVerificationCode)) {
        return new NextResponse(
          "Enter the 6-digit verification code sent to your new email.",
          {
            status: 400,
          },
        );
      }

      const identifier = buildEmailChangeIdentifier(userId, email);
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: {
          identifier,
          token: {
            startsWith: `${emailVerificationCode}:`,
          },
        },
      });

      if (!tokenRecord || tokenRecord.expires < new Date()) {
        return new NextResponse(
          "Invalid or expired verification code. Request a new one.",
          {
            status: 400,
          },
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        image: image || null,
        ...(isEmailChanged ? { emailVerified: new Date() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        accounts: {
          orderBy: { provider: "asc" },
          select: {
            provider: true,
            type: true,
          },
        },
      },
    });

    if (isEmailChanged) {
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: buildEmailChangeIdentifier(userId, email),
        },
      });
    }

    return NextResponse.json(buildProfileResponse(user));
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new NextResponse("This email is already in use", {
        status: 409,
      });
    }

    console.error("PROFILE_PATCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
