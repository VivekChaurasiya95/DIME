import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase();

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const category = normalize(url.searchParams.get("category"));
    const search = normalize(url.searchParams.get("search"));
    const sort = normalize(url.searchParams.get("sort")) || "updated";

    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 120,
    });

    let filtered = notes;

    if (category && category !== "all") {
      filtered = filtered.filter(
        (note) => note.category.toLowerCase() === category,
      );
    }

    if (search) {
      filtered = filtered.filter((note) => {
        const haystack = `${note.title} ${note.content}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (sort === "title") {
      filtered = filtered
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sort === "oldest") {
      filtered = filtered
        .slice()
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    }

    return NextResponse.json({
      items: filtered,
      total: filtered.length,
      categories: [
        "All Notes",
        "Market Research",
        "Tech Stack",
        "User Feedback",
        "Design Ideas",
        "General",
      ],
    });
  } catch (error: unknown) {
    console.error("NOTES_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

type CreatePayload = {
  title?: string;
  content?: string;
  category?: string;
  tone?: string;
  isPinned?: boolean;
  ideaId?: string | null;
};

const allowedTones = new Set(["orange", "blue", "green", "purple"]);

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as CreatePayload;
    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();

    if (title.length < 3 || content.length < 10) {
      return new NextResponse("Title or content too short", { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title,
        content,
        category: (body.category ?? "General").trim() || "General",
        tone: allowedTones.has((body.tone ?? "").trim())
          ? (body.tone ?? "orange")
          : "orange",
        isPinned: Boolean(body.isPinned),
        ideaId: body.ideaId?.trim() || null,
      },
    });

    return NextResponse.json(note);
  } catch (error: unknown) {
    console.error("NOTES_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
