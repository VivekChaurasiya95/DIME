import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    noteId: string;
  }>;
};

type PatchPayload = {
  title?: string;
  content?: string;
  category?: string;
  tone?: string;
  isPinned?: boolean;
};

const allowedTones = new Set(["orange", "blue", "green", "purple"]);

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { noteId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as PatchPayload;

    const existing = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return new NextResponse("Note not found", { status: 404 });
    }

    const updated = await prisma.note.update({
      where: {
        id: noteId,
      },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.content === "string"
          ? { content: body.content.trim() }
          : {}),
        ...(typeof body.category === "string"
          ? { category: body.category.trim() || "General" }
          : {}),
        ...(typeof body.tone === "string" && allowedTones.has(body.tone.trim())
          ? { tone: body.tone.trim() }
          : {}),
        ...(typeof body.isPinned === "boolean"
          ? { isPinned: body.isPinned }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("NOTE_PATCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { noteId } = await context.params;

    const existing = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return new NextResponse("Note not found", { status: 404 });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("NOTE_DELETE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
