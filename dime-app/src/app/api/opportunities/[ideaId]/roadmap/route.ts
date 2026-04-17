import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    ideaId: string;
  }>;
};

export async function POST(_req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { ideaId } = await context.params;

    const idea = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        userId: session.user.id,
      },
    });

    if (!idea) {
      return new NextResponse("Opportunity not found", { status: 404 });
    }

    await prisma.idea.update({
      where: { id: idea.id },
      data: { status: "SAVED" },
    });

    const roadmap = [
      {
        step: 1,
        title: "Market Validation Sprint",
        detail: "Run 10 user interviews and validate top 3 pain points.",
      },
      {
        step: 2,
        title: "Pilot Scope Definition",
        detail:
          "Define MVP feature boundary and success metrics for first release.",
      },
      {
        step: 3,
        title: "Execution Plan",
        detail:
          "Align team resources, compliance checks, and go-to-market timeline.",
      },
    ];

    return NextResponse.json({
      ideaId: idea.id,
      title: idea.title,
      roadmap,
      message: "Roadmap generated and opportunity moved to saved projects.",
    });
  } catch (error: unknown) {
    console.error("OPPORTUNITY_ROADMAP_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
