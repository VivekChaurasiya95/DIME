"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Loader2, Lock, LineChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const steps = [
  {
    id: 1,
    title: "Running similarity scan",
    desc: "Comparing your idea against historical project corpus",
  },
  {
    id: 2,
    title: "Computing market pain",
    desc: "Aggregating demand and review sentiment signals",
  },
  {
    id: 3,
    title: "Extracting problem keywords",
    desc: "Detecting recurring issues and high-friction topics",
  },
  {
    id: 4,
    title: "Preparing idea analysis report",
    desc: "Finalizing novelty, market pain, and opportunity scores",
  },
];

export default function AnalyzerLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("ideaId");
  const analysisSource = searchParams.get("source");
  const usePrecomputedAnalysis = analysisSource === "start-analysis";
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(12);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ideaId) {
      router.replace("/dashboard/analyzer");
      return;
    }

    let active = true;
    let completeTimer: number | null = null;

    const progressTimer = window.setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = usePrecomputedAnalysis
          ? Math.min(currentProgress + 7, 96)
          : Math.min(currentProgress + 4, 92);

        if (nextProgress >= 70) {
          setCurrentStep(4);
        } else if (nextProgress >= 48) {
          setCurrentStep(3);
        } else if (nextProgress >= 24) {
          setCurrentStep(2);
        }

        return nextProgress;
      });
    }, 700);

    const finalizeAndRedirect = () => {
      setCurrentStep(4);
      setProgress(100);

      window.setTimeout(() => {
        router.push(`/dashboard/analyzer/results?ideaId=${ideaId}`);
      }, 500);
    };

    if (usePrecomputedAnalysis) {
      completeTimer = window.setTimeout(() => {
        if (!active) {
          return;
        }

        finalizeAndRedirect();
      }, 1700);

      return () => {
        active = false;
        window.clearInterval(progressTimer);

        if (completeTimer) {
          window.clearTimeout(completeTimer);
        }
      };
    }

    const runAnalysis = async () => {
      try {
        const response = await fetch(`/api/ideas/${ideaId}/analyze`, {
          method: "POST",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Unable to complete analysis");
        }

        if (!active) {
          return;
        }

        finalizeAndRedirect();
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        setIsError(true);
        setErrorMessage(
          error instanceof Error ? error.message : "Analysis request failed",
        );
      }
    };

    runAnalysis();

    return () => {
      active = false;
      window.clearInterval(progressTimer);

      if (completeTimer) {
        window.clearTimeout(completeTimer);
      }
    };
  }, [ideaId, router, usePrecomputedAnalysis]);

  const handleRetry = () => {
    if (ideaId) {
      const sourceQuery = usePrecomputedAnalysis
        ? "&source=start-analysis"
        : "";
      router.replace(
        `/dashboard/analyzer/loading?ideaId=${ideaId}${sourceQuery}`,
      );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-h-[calc(100vh-140px)] flex flex-col items-center justify-center -mt-10 animate-fade-in">
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 text-[#ea580c] shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <LineChart className="h-8 w-8" />
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900 mb-3 text-center dark:text-slate-100">
        Running idea analysis...
      </h2>
      <p className="text-slate-500 font-medium text-center max-w-md mx-auto mb-12 dark:text-slate-400">
        We are processing similarity, sentiment, and keyword signals for your
        submitted idea.
      </p>

      {/* Progress Card */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 dark:border-slate-700 dark:bg-slate-900">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c] animate-pulse"></div>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center dark:border-slate-700">
                    <Loader2 className="w-3 h-3 text-slate-300 dark:text-slate-500" />
                  </div>
                )}
              </div>

              <div
                className={`flex-1 ${isPending ? "opacity-40" : "opacity-100"} transition-opacity duration-300`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h4
                    className={`font-bold text-sm ${isCurrent ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    {step.title}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-[#ea580c] tracking-wider uppercase">
                      Processing
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step.desc}
                </p>

                {isCurrent && (
                  <div className="mt-3">
                    <Progress
                      value={progress}
                      className="h-1.5 [&>div]:bg-[#ea580c]"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/35">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">
                  Analysis failed
                </p>
                <p className="mt-1 text-sm text-red-600">
                  {errorMessage ?? "Could not complete analysis at this time."}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    onClick={handleRetry}
                    className="h-9 bg-[#ea580c] text-white hover:bg-[#d04e0a]"
                  >
                    Retry
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/analyzer")}
                    className="h-9"
                  >
                    Back to Idea Analysis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
        <Lock className="w-4 h-4 mr-2" />
        Secure and private processing
      </div>

      <p className="mt-8 text-xs font-medium text-slate-400 dark:text-slate-500">
        Results include Novelty Score, Market Pain, Opportunity Score, and
        keyword-based problem areas.
      </p>
    </div>
  );
}
