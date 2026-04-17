import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const targetAudience =
      typeof body?.targetAudience === "string"
        ? body.targetAudience.trim().toLowerCase()
        : "";
    const industrySource =
      typeof body?.industry === "string" ? body.industry : body?.domain;
    const industry =
      typeof industrySource === "string" ? industrySource.trim() : "";

    if (!title || !description || !targetAudience || !industry) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (title.length < 4 || description.length < 30) {
      return new NextResponse(
        "Title or description is too short for meaningful analysis",
        { status: 400 },
      );
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        targetAudience,
        industry,
        status: "DRAFT",
        userId: session.user.id,
      },
    });

    return NextResponse.json(idea);
  } catch (error: unknown) {
    console.error("IDEA_CREATION_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);

    const ideas = await prisma.idea.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
    });

    return NextResponse.json(ideas);
  } catch (error: unknown) {
    console.error("IDEAS_FETCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
