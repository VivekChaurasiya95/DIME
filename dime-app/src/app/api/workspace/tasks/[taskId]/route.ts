import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

type PatchPayload = {
  title?: string;
  status?: "TODO" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  assignee?: string | null;
  dueDate?: string | null;
};

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as PatchPayload;

    const existing = await prisma.workspaceTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const updated = await prisma.workspaceTask.update({
      where: { id: taskId },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.assignee !== undefined
          ? { assignee: body.assignee ? body.assignee.trim() : null }
          : {}),
        ...(body.dueDate !== undefined
          ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("WORKSPACE_TASK_PATCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await context.params;

    const existing = await prisma.workspaceTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return new NextResponse("Task not found", { status: 404 });
    }

    await prisma.workspaceTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("WORKSPACE_TASK_DELETE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
