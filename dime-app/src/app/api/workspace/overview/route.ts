import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase();

const progressFromIdea = (idea: {
  overallViability: number | null;
  feasibilityScore: number | null;
  marketDemand: number | null;
}) => {
  const viability = idea.overallViability ?? 50;
  const feasibility = idea.feasibilityScore ?? 50;
  const demand = idea.marketDemand ?? 50;

  return Math.max(
    10,
    Math.min(
      100,
      Math.round(viability * 0.55 + feasibility * 0.25 + demand * 0.2),
    ),
  );
};

const toTimeAgo = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / min))} min ago`;
  }

  if (diff < day) {
    const h = Math.max(1, Math.floor(diff / hour));
    return `${h} hour${h > 1 ? "s" : ""} ago`;
  }

  const d = Math.max(1, Math.floor(diff / day));
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const tab = normalize(url.searchParams.get("tab")) || "all";

    const [ideas, tasks, notes] = await Promise.all([
      prisma.idea.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 60,
      }),
      prisma.workspaceTask.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 40,
      }),
      prisma.note.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const filteredIdeas = ideas.filter((idea) => {
      if (tab === "validation") {
        return ["DRAFT", "ANALYZING", "VALIDATED"].includes(idea.status);
      }

      if (tab === "launch") {
        return ["VALIDATED", "SAVED"].includes(idea.status);
      }

      if (tab === "archived") {
        return idea.status === "REJECTED";
      }

      return true;
    });

    const ideasPayload = filteredIdeas.map((idea) => ({
      id: idea.id,
      label: idea.industry,
      status: idea.status,
      title: idea.title,
      excerpt: idea.description,
      progress: progressFromIdea(idea),
      accent: (idea.overallViability ?? 0) >= 70 ? "orange" : "blue",
      updatedAt: idea.updatedAt,
    }));

    const activity = [
      ...ideas.slice(0, 4).map((idea) => ({
        id: `idea-${idea.id}`,
        text: `${idea.title} is ${idea.status.toLowerCase()}`,
        time: toTimeAgo(idea.updatedAt),
        highlight: idea.status === "VALIDATED" || idea.status === "SAVED",
      })),
      ...tasks.slice(0, 3).map((task) => ({
        id: `task-${task.id}`,
        text: `Task updated: ${task.title}`,
        time: toTimeAgo(task.updatedAt),
        highlight: task.status === "DONE",
      })),
      ...notes.slice(0, 2).map((note) => ({
        id: `note-${note.id}`,
        text: `Note edited: ${note.title}`,
        time: toTimeAgo(note.updatedAt),
        highlight: note.isPinned,
      })),
    ]
      .sort((a, b) => (a.time > b.time ? -1 : 1))
      .slice(0, 8);

    const taskList = tasks.slice(0, 8).map((task) => ({
      id: task.id,
      title: task.title,
      meta: task.assignee
        ? `${task.assignee}${task.dueDate ? ` • due ${task.dueDate.toLocaleDateString("en-US")}` : ""}`
        : task.dueDate
          ? `Due ${task.dueDate.toLocaleDateString("en-US")}`
          : "No due date",
      done: task.status === "DONE",
      status: task.status,
      priority: task.priority,
      ideaId: task.ideaId,
    }));

    const quickNote = notes[0]
      ? {
          id: notes[0].id,
          title: notes[0].title,
          content: notes[0].content,
          updatedAt: toTimeAgo(notes[0].updatedAt),
        }
      : null;

    const mostPromising = ideas
      .slice()
      .sort((a, b) => (b.overallViability ?? 0) - (a.overallViability ?? 0))[0];

    return NextResponse.json({
      tab,
      tabs: {
        all: ideas.length,
        validation: ideas.filter((idea) =>
          ["DRAFT", "ANALYZING", "VALIDATED"].includes(idea.status),
        ).length,
        launch: ideas.filter((idea) =>
          ["VALIDATED", "SAVED"].includes(idea.status),
        ).length,
        archived: ideas.filter((idea) => idea.status === "REJECTED").length,
      },
      ideas: ideasPayload,
      stats: {
        totalIdeas: ideas.length,
        validated: ideas.filter(
          (idea) => idea.status === "VALIDATED" || idea.status === "SAVED",
        ).length,
      },
      mostPromising: mostPromising
        ? {
            id: mostPromising.id,
            title: mostPromising.title,
            score: Math.round(mostPromising.overallViability ?? 0),
          }
        : null,
      activity,
      taskList,
      quickNote,
    });
  } catch (error: unknown) {
    console.error("WORKSPACE_OVERVIEW_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

type TaskPayload = {
  title?: string;
  ideaId?: string;
  dueDate?: string;
  assignee?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
};

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as TaskPayload;
    const title = (body.title ?? "").trim();

    if (title.length < 3) {
      return new NextResponse("Task title must be at least 3 characters", {
        status: 400,
      });
    }

    const task = await prisma.workspaceTask.create({
      data: {
        userId: session.user.id,
        title,
        ideaId: body.ideaId?.trim() || null,
        assignee: body.assignee?.trim() || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority ?? "MEDIUM",
      },
    });

    return NextResponse.json(task);
  } catch (error: unknown) {
    console.error("WORKSPACE_TASK_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
