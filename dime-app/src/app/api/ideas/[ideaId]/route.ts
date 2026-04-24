import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { getSimilarity } from "@/lib/analysis/similarity";

type RouteContext = {
  params: Promise<{
    ideaId: string;
  }>;
};

const allowedStatuses = new Set([
  "DRAFT",
  "ANALYZING",
  "VALIDATED",
  "REJECTED",
  "SAVED",
]);

export async function GET(_req: Request, context: RouteContext) {
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
      return new NextResponse("Idea not found", { status: 404 });
    }

    // Use stored scores from DB when available (already computed during analysis).
    // Only fall back to expensive live similarity computation for unanalyzed ideas.
    const hasStoredScores =
      idea.noveltyScore !== null &&
      idea.marketPainScore !== null &&
      idea.opportunityScore !== null;

    if (hasStoredScores) {
      const similarity = getSimilarity(idea.description);

      return NextResponse.json({
        ...idea,
        novelty_score: idea.noveltyScore,
        market_pain: idea.marketPainScore,
        opportunity_score: idea.opportunityScore,
        max_similarity: similarity.max_similarity,
        similar_projects: similarity.similar_projects.map((project) => ({
          Name: project.type === "idea" ? "Similar Idea" : "Related GitHub Project",
          Description: project.description,
          "Similarity Score": project.score,
          type: project.type,
        })),
      });
    }

    // Fallback: compute similarity live for ideas that haven't been analyzed yet
    const similarity = getSimilarity(idea.description);

    return NextResponse.json({
      ...idea,
      novelty_score: similarity.novelty_score,
      market_pain: 0,
      opportunity_score: similarity.novelty_score * 0.6,
      max_similarity: similarity.max_similarity,
      similar_projects: similarity.similar_projects.map((project) => ({
        Name: project.type === "idea" ? "Similar Idea" : "Related GitHub Project",
        Description: project.description,
        "Similarity Score": project.score,
        type: project.type,
      })),
    });
  } catch (error: unknown) {
    console.error("IDEA_FETCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { ideaId } = await context.params;
    const payload = await req.json();
    const status =
      typeof payload?.status === "string"
        ? payload.status.trim().toUpperCase()
        : undefined;

    if (status && !allowedStatuses.has(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    const existing = await prisma.idea.findFirst({
      where: {
        id: ideaId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return new NextResponse("Idea not found", { status: 404 });
    }

    const updatedIdea = await prisma.idea.update({
      where: {
        id: ideaId,
      },
      data: {
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json(updatedIdea);
  } catch (error: unknown) {
    console.error("IDEA_UPDATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
