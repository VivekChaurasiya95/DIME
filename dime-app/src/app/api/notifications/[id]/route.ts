import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!notification) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
      select: { id: true, read: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("NOTIFICATION_PATCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
