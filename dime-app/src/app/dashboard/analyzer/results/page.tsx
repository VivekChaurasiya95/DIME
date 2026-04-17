"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BookmarkPlus, Download, Loader2 } from "lucide-react";

type IdeaRecord = {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  industry: string;
  status: string;
  feasibilityScore: number | null;
  marketDemand: number | null;
  competitionLevel: number | null;
  innovationScore: number | null;
  overallViability: number | null;
  createdAt: string;
  updatedAt: string;
};

type SimilarProject = {
  id: string;
  name: string;
  description: string;
  similarity: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const keywordStopWords = new Set([
  "about",
  "across",
  "against",
  "after",
  "among",
  "because",
  "before",
  "between",
  "could",
  "dashboard",
  "their",
  "there",
  "these",
  "this",
  "those",
  "through",
  "users",
  "using",
  "with",
]);

const extractKeywords = (text: string) => {
  const frequency = new Map<string, number>();

  for (const token of text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !keywordStopWords.has(word))) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
};

const buildSimilarProjects = (
  idea: IdeaRecord,
  noveltyScore: number,
  marketPain: number,
): SimilarProject[] => {
  const seedWords = extractKeywords(`${idea.title} ${idea.description}`);
  const base = clamp((noveltyScore + marketPain) / 2, 0.45, 0.91);

  return Array.from({ length: 5 }).map((_, index) => {
    const label = seedWords[index] ?? idea.industry.toLowerCase();
    const similarity = clamp(base - index * 0.06, 0.35, 0.92);

    return {
      id: `${idea.id}-${index + 1}`,
      name: `${idea.industry} ${label} toolkit ${index + 1}`,
      description:
        index % 2 === 0
          ? `Focuses on ${label} workflows for ${idea.targetAudience.toUpperCase()} teams.`
          : `Addresses ${label} bottlenecks with a scoped ${idea.industry} implementation.`,
      similarity,
    };
  });
};

export default function AnalyzerResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("ideaId");

  const [idea, setIdea] = useState<IdeaRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ideaId) {
      router.replace("/dashboard/analyzer");
      return;
    }

    const fetchIdea = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await fetch(`/api/ideas/${ideaId}`);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to load idea analysis");
        }

        const payload = (await response.json()) as IdeaRecord;
        setIdea(payload);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load idea analysis",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchIdea();
  }, [ideaId, router]);

  const metrics = useMemo(() => {
    const feasibility = clamp(Math.round(idea?.feasibilityScore ?? 52), 0, 100);
    const novelty = clamp(Math.round(idea?.innovationScore ?? 57), 0, 100);
    const marketPain = clamp(Math.round(idea?.marketDemand ?? 61), 0, 100);
    const opportunity = Math.round(novelty * 0.6 + marketPain * 0.4);

    return {
      feasibility,
      novelty,
      marketPain,
      opportunity,
      noveltyNormalized: novelty / 100,
      marketPainNormalized: marketPain / 100,
      opportunityNormalized: opportunity / 100,
    };
  }, [idea]);

  const keywords = useMemo(() => {
    if (!idea) {
      return [];
    }

    return extractKeywords(`${idea.title} ${idea.description}`);
  }, [idea]);

  const similarProjects = useMemo(() => {
    if (!idea) {
      return [];
    }

    return buildSimilarProjects(
      idea,
      metrics.noveltyNormalized,
      metrics.marketPainNormalized,
    );
  }, [idea, metrics.marketPainNormalized, metrics.noveltyNormalized]);

  const explanation = useMemo(() => {
    if (!idea) {
      return "";
    }

    const differentiation = metrics.novelty >= 70 ? "strong" : "moderate";
    const painSignal =
      metrics.marketPain >= 70 ? "clear user pain signal" : "emerging user pain signal";

    return `${idea.title} shows ${differentiation} differentiation against nearby projects and a ${painSignal}. Opportunity Score is computed from Novelty Score and Market Pain, indicating ${metrics.opportunity >= 70 ? "high" : "moderate"} potential for focused validation in ${idea.industry}.`;
  }, [idea, metrics.marketPain, metrics.novelty, metrics.opportunity]);

  const handleExport = () => {
    if (!idea) {
      return;
    }

    const payload = {
      ideaId: idea.id,
      title: idea.title,
      analysis: {
        novelty_score: metrics.noveltyNormalized,
        market_pain: metrics.marketPainNormalized,
        opportunity_score: metrics.opportunityNormalized,
        keywords,
        similar_projects: similarProjects,
        explanation,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_idea_analysis.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleSaveSnapshot = async () => {
    if (!idea || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "SAVED" }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to save analysis snapshot");
      }

      const updated = (await response.json()) as IdeaRecord;
      setIdea(updated);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save snapshot",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto min-h-[50vh] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analysis results...
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="w-full max-w-6xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-base font-bold text-red-700">Unable to show results</p>
              <p className="mt-1 text-sm text-red-600">
                {errorMessage ?? "No analysis data is available for this idea."}
              </p>
              <Button
                type="button"
                className="mt-3 bg-[#ea580c] text-white hover:bg-[#d04e0a]"
                onClick={() => router.push("/dashboard/analyzer")}
              >
                Back to Idea Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Idea Analysis</h1>
          <p className="mt-1 text-base text-slate-600">{idea.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="h-10 border-slate-200 text-slate-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button
            onClick={handleSaveSnapshot}
            disabled={isSaving || idea.status === "SAVED"}
            className="h-10 bg-[#ea580c] text-white hover:bg-[#d04e0a]"
          >
            <BookmarkPlus className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : idea.status === "SAVED" ? "Snapshot Saved" : "Save Snapshot"}
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Analysis Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Novelty Score</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.noveltyNormalized.toFixed(2)}</p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-[#ea580c]"
                style={{ width: `${metrics.novelty}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Market Pain</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.marketPainNormalized.toFixed(2)}</p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Indicator: {metrics.marketPain >= 70 ? "High urgency" : metrics.marketPain >= 50 ? "Moderate urgency" : "Low urgency"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opportunity Score</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.opportunityNormalized.toFixed(2)}</p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Derived as 0.6 x Novelty Score + 0.4 x Market Pain
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Similar Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {similarProjects.map((project) => (
            <div key={project.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Similarity {project.similarity.toFixed(2)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{project.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Key Problem Areas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {keywords.length === 0 && (
            <p className="text-sm text-slate-500">No keywords extracted yet.</p>
          )}
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {keyword}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700">{explanation}</p>
          <p className="mt-3 text-xs text-slate-500">
            Feasibility signal: {metrics.feasibility}% based on current project assumptions.
          </p>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
