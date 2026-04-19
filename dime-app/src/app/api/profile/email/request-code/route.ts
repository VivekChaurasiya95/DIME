import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import {
  buildEmailChangeIdentifier,
  createStoredEmailToken,
  EMAIL_CODE_TTL_MS,
  generateEmailVerificationCode,
  isValidEmail,
  normalizeEmail,
  sendEmailVerificationCode,
} from "@/lib/profile-email-verification";

type RequestPayload = {
  email?: unknown;
};

const requireSessionUserId = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: session.user.id,
    displayName: session.user.name ?? "there",
  };
};

export async function POST(req: Request) {
  try {
    const sessionInfo = await requireSessionUserId();

    if (!sessionInfo) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as RequestPayload;
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return new NextResponse("Please provide a valid email address", {
        status: 400,
      });
    }

    const emailInUse = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: sessionInfo.userId,
        },
      },
      select: { id: true },
    });

    if (emailInUse) {
      return new NextResponse("This email is already in use", {
        status: 409,
      });
    }

    const code = generateEmailVerificationCode();
    const identifier = buildEmailChangeIdentifier(sessionInfo.userId, email);
    const expires = new Date(Date.now() + EMAIL_CODE_TTL_MS);

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: createStoredEmailToken(code),
        expires,
      },
    });

    let devFallback = false;
    let messageId: string | null = null;
    let providerResponse: string | null = null;

    try {
      const deliveryResult = await sendEmailVerificationCode(
        email,
        code,
        sessionInfo.displayName,
      );

      devFallback = deliveryResult.devFallback;
      messageId = deliveryResult.messageId;
      providerResponse = deliveryResult.response;
    } catch (error) {
      console.error("PROFILE_EMAIL_CODE_SEND_ERROR", error);
      return new NextResponse(
        "Unable to send verification code email. Check SMTP configuration.",
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: devFallback
        ? "Verification code generated for development. Check server logs for the code."
        : "Verification code sent to your new email address. Check inbox or spam, and use only the latest code.",
      expiresAt: expires.toISOString(),
      devFallback,
      ...(process.env.NODE_ENV !== "production"
        ? {
            deliveryDebug: {
              messageId,
              providerResponse,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("PROFILE_EMAIL_CODE_REQUEST_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
