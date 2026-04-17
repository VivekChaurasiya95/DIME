import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { prisma } from "../../../../../../lib/prisma";
import { analyzeIdeaPayload } from "@/lib/idea-analysis";

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

    const existing = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return new NextResponse("Idea not found", { status: 404 });
    }

    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "ANALYZING" },
    });

    const analysis = analyzeIdeaPayload({
      title: existing.title,
      description: existing.description,
      targetAudience: existing.targetAudience,
      industry: existing.industry,
    });

    const updatedIdea = await prisma.idea.update({
      where: { id: ideaId },
      data: {
        feasibilityScore: analysis.feasibilityScore,
        marketDemand: analysis.marketDemand,
        competitionLevel: analysis.competitionLevel,
        innovationScore: analysis.innovationScore,
        overallViability: analysis.overallViability,
        status: analysis.status,
      },
    });

    return NextResponse.json(updatedIdea);
  } catch (error: unknown) {
    console.error("IDEA_ANALYSIS_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
