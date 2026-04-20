import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { analyzeIdeaPayload } from "@/lib/idea-analysis";
import { getSimilarity } from "@/lib/analysis/similarity";
import { getSentimentInsights } from "@/lib/analysis/sentiment";

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("API START");

  try {
    const session = await auth();

    if (!session?.user?.id) {
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

    const created = await prisma.idea.create({
      data: {
        title,
        description,
        targetAudience,
        industry,
        userId: session.user.id,
        status: "ANALYZING",
      },
    });

    const analysis = analyzeIdeaPayload({
      title,
      description,
      targetAudience,
      industry,
    });

    console.log("Before similarity:", Date.now() - startTime);
    const similarity = getSimilarity(description);
    console.log("After similarity:", Date.now() - startTime);

    const sentiment = getSentimentInsights();
    const opportunityScore = Number(
      (similarity.novelty_score * 0.6 + sentiment.negative_ratio * 0.4).toFixed(
        6,
      ),
    );

    const updated = await prisma.idea.update({
      where: { id: created.id },
      data: {
        feasibilityScore: analysis.feasibilityScore,
        marketDemand: analysis.marketDemand,
        competitionLevel: analysis.competitionLevel,
        innovationScore: analysis.innovationScore,
        overallViability: analysis.overallViability,
        status: analysis.status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    console.log("API END:", Date.now() - startTime);
    return NextResponse.json({
      input_idea: description,
      novelty_score: similarity.novelty_score,
      market_pain: sentiment.negative_ratio,
      opportunity_score: opportunityScore,
      max_similarity: similarity.max_similarity,
      similar_projects: similarity.similar_projects,
      key_problem_areas: sentiment.top_keywords,
      ...analysis,
      ...updated,
    });
  } catch (error: unknown) {
    console.error("IDEA_START_ANALYSIS_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
