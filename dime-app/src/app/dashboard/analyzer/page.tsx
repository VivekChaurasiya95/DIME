"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  Terminal,
  CircleDollarSign,
  AlertCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";

const domains = [
  "AI/ML",
  "Web App",
  "Mobile App",
  "SaaS",
  "Cybersecurity",
  "Blockchain",
  "Data Science",
];
const initialStacks = ["React", "Node.js"];
const techStackOptions = [
  "Python",
  "AWS",
  "Azure",
  "PostgreSQL",
  "Docker",
  "Kubernetes",
];

const audienceOptions = [
  {
    value: "b2b",
    label: "B2B (Enterprise/Small Business)",
  },
  {
    value: "b2c",
    label: "B2C (Consumer)",
  },
  {
    value: "b2b2c",
    label: "B2B2C",
  },
];

const monetizationOptions = [
  {
    value: "saas",
    label: "Subscription (SaaS)",
  },
  {
    value: "freemium",
    label: "Freemium",
  },
  {
    value: "one-time",
    label: "One-time Purchase",
  },
  {
    value: "ads",
    label: "Ad-Supported",
  },
];

const familiarityOptions = [
  {
    value: "expert",
    label: "Expert / High Proficiency",
  },
  {
    value: "intermediate",
    label: "Intermediate",
  },
  {
    value: "beginner",
    label: "Beginner",
  },
];

const teamSizeOptions = [
  {
    value: "solo",
    label: "Solo Founder",
  },
  {
    value: "small",
    label: "Small Team (2-5)",
  },
  {
    value: "medium",
    label: "Medium Team (6-15)",
  },
  {
    value: "startup",
    label: "Startup (15+)",
  },
];

const complexityOptions = [
  {
    value: "low",
    label: "Low (MVP/Simple Tool)",
  },
  {
    value: "medium",
    label: "Medium (Standard SaaS)",
  },
  {
    value: "high",
    label: "High (Complex/Enterprise)",
  },
];

const timelineOptions = [
  {
    value: "1month",
    label: "< 1 Month",
  },
  {
    value: "3months",
    label: "1-3 Months",
  },
  {
    value: "6months",
    label: "3-6 Months",
  },
  {
    value: "year",
    label: "6+ Months",
  },
];

const getOptionLabel = (
  options: Array<{ value: string; label: string }>,
  value: string | null,
  fallback: string,
) => {
  if (!value) {
    return fallback;
  }

  return options.find((option) => option.value === value)?.label ?? fallback;
};

type IdeaApiResponse = {
  id: string;
  status?: string;
  novelty_score?: number;
  market_pain?: number;
  opportunity_score?: number;
};

export default function IdeaAnalyzerPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("AI/ML");
  const [selectedStacks, setSelectedStacks] = useState<string[]>(initialStacks);
  const [customStack, setCustomStack] = useState("");
  const [targetAudience, setTargetAudience] = useState("b2b");
  const [monetizationStrategy, setMonetizationStrategy] = useState("saas");
  const [techStackFamiliarity, setTechStackFamiliarity] = useState("expert");
  const [expectedTeamSize, setExpectedTeamSize] = useState("solo");
  const [projectComplexity, setProjectComplexity] = useState("low");
  const [desiredTimeline, setDesiredTimeline] = useState("1month");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStack = (stack: string) => {
    if (selectedStacks.includes(stack)) {
      setSelectedStacks(selectedStacks.filter((s) => s !== stack));
    } else {
      setSelectedStacks([...selectedStacks, stack]);
    }
  };

  const addCustomStack = () => {
    const normalizedStack = customStack.trim();

    if (!normalizedStack) {
      return;
    }

    if (
      selectedStacks.some(
        (stack) => stack.toLowerCase() === normalizedStack.toLowerCase(),
      )
    ) {
      setCustomStack("");
      return;
    }

    setSelectedStacks((prev) => [...prev, normalizedStack]);
    setCustomStack("");
  };

  const handleCustomStackKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomStack();
    }
  };

  const canSubmit = useMemo(
    () => title.trim().length >= 4 && description.trim().length >= 30,
    [title, description],
  );

  const handleAnalyze = async () => {
    setErrorMessage(null);

    if (!canSubmit) {
      setErrorMessage(
        "Please add a clear title and a richer description before running analysis.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ideas/start-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          targetAudience,
          industry: selectedDomain,
          techStacks: selectedStacks,
          monetizationStrategy,
          techStackFamiliarity,
          expectedTeamSize,
          projectComplexity,
          desiredTimeline,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to create idea for analysis");
      }

      const idea = (await response.json()) as IdeaApiResponse;

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `idea-analysis:${idea.id}`,
          JSON.stringify({
            novelty_score: idea.novelty_score,
            market_pain: idea.market_pain,
            opportunity_score: idea.opportunity_score,
          }),
        );
      }

      router.push(
        `/dashboard/analyzer/loading?ideaId=${idea.id}&source=start-analysis`,
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting your analysis.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-page space-y-6 animate-fade-in">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="app-title">Idea Analysis</h1>
            <p className="app-subtitle">
              Submit your concept and generate a structured idea analysis based
              on novelty, market pain, and keyword signals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-orange-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-orange-900/60">
              TF-IDF similarity
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-orange-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-orange-900/60">
              Sentiment weighting
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-orange-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-orange-900/60">
              Keyword extraction
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-[1.6fr_1fr]">
        <section className="app-surface p-6 md:p-7">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="idea-title"
                className="text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                Idea Title
              </Label>
              <Input
                id="idea-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Next-Gen Inventory Management System"
                className="h-14 border-orange-200 bg-orange-50/20 text-base font-medium text-slate-800 placeholder:text-orange-900/40 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/40 focus-visible:border-orange-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-orange-500/20 md:text-lg dark:border-orange-800/70 dark:bg-orange-950/30 dark:text-slate-100 dark:placeholder:text-orange-300/60 dark:hover:bg-orange-950/45 dark:focus-visible:bg-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="idea-description"
                className="text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                Idea Description
              </Label>
              <Textarea
                id="idea-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the problem you are solving, your target audience, and the core solution..."
                className="min-h-[200px] resize-y border-orange-200 bg-orange-50/20 p-4 text-base font-medium leading-relaxed text-slate-800 placeholder:text-orange-900/40 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/40 focus-visible:border-orange-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-orange-500/20 md:text-lg dark:border-orange-800/70 dark:bg-orange-950/30 dark:text-slate-100 dark:placeholder:text-orange-300/60 dark:hover:bg-orange-950/45 dark:focus-visible:bg-slate-900"
              />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tip: Include user pain points and your primary differentiator
                for better analysis quality.
              </p>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Domain Selection
              </Label>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => {
                  const isSelected = selectedDomain === domain;
                  return (
                    <button
                      key={domain}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setSelectedDomain(domain)}
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition-all shadow-sm md:text-sm ${
                        isSelected
                          ? "border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 text-[#ea580c] shadow-md shadow-orange-200/50"
                          : "border-orange-200 bg-white text-slate-600 hover:border-orange-400 hover:bg-orange-50/80 hover:text-[#ea580c] hover:shadow-md hover:shadow-orange-200/30 dark:border-orange-800/70 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-orange-950/45 dark:hover:text-orange-200"
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Tech Stack Selection
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedStacks.map((stack) => (
                  <button
                    key={stack}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => toggleStack(stack)}
                    className="group inline-flex items-center rounded-full border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-2 text-xs font-bold text-[#ea580c] shadow-md shadow-orange-200/40 transition-all hover:border-orange-500 hover:shadow-lg hover:shadow-orange-300/50 md:text-sm dark:border-orange-700 dark:bg-orange-900/35 dark:text-orange-200 dark:shadow-none"
                  >
                    {stack}
                    <X className="ml-2 h-4 w-4 text-orange-500 group-hover:text-orange-700 transition-colors" />
                  </button>
                ))}

                {techStackOptions
                  .filter((t) => !selectedStacks.includes(t))
                  .map((stack) => (
                    <button
                      key={stack}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => toggleStack(stack)}
                      className="rounded-full border-2 border-orange-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all shadow-sm hover:border-orange-400 hover:bg-orange-50 hover:text-[#ea580c] hover:shadow-md hover:shadow-orange-200/40 md:text-sm dark:border-orange-800/70 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-orange-950/35 dark:hover:text-orange-200"
                    >
                      {stack}
                    </button>
                  ))}

                <div className="flex w-full flex-col gap-2 rounded-lg border border-dashed border-orange-300 bg-orange-50/10 p-2 sm:w-auto sm:min-w-[250px] sm:flex-row sm:items-center dark:border-orange-800/70 dark:bg-orange-950/25">
                  <Input
                    value={customStack}
                    onChange={(event) => setCustomStack(event.target.value)}
                    onKeyDown={handleCustomStackKeyDown}
                    placeholder="Add Other"
                    className="h-10 border-orange-200 bg-white text-sm font-medium text-slate-800 placeholder:text-orange-900/40 shadow-sm transition-all hover:border-orange-400 focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/20 sm:min-w-[150px] sm:text-base dark:border-orange-800/70 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-orange-300/60"
                  />
                  <Button
                    type="button"
                    onClick={addCustomStack}
                    variant="outline"
                    className="h-10 border-orange-200 bg-white text-sm font-bold text-[#ea580c] hover:border-orange-400 hover:bg-orange-50 hover:text-[#ea580c] shadow-sm transition-all dark:border-orange-800/70 dark:bg-slate-900 dark:text-orange-200 dark:hover:bg-orange-950/35"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Target Audience
                </Label>
                <Select
                  value={targetAudience}
                  onValueChange={setTargetAudience}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select target audience">
                      {(value: string | null) =>
                        getOptionLabel(
                          audienceOptions,
                          value,
                          "Select target audience",
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {audienceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Monetization Strategy
                </Label>
                <Select
                  value={monetizationStrategy}
                  onValueChange={setMonetizationStrategy}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select strategy">
                      {(value: string | null) =>
                        getOptionLabel(
                          monetizationOptions,
                          value,
                          "Select strategy",
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {monetizationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tech Stack Familiarity
                </Label>
                <Select
                  value={techStackFamiliarity}
                  onValueChange={setTechStackFamiliarity}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select familiarity">
                      {(value: string | null) =>
                        getOptionLabel(
                          familiarityOptions,
                          value,
                          "Select familiarity",
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {familiarityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Expected Team Size
                </Label>
                <Select
                  value={expectedTeamSize}
                  onValueChange={setExpectedTeamSize}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select size">
                      {(value: string | null) =>
                        getOptionLabel(teamSizeOptions, value, "Select size")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Project Complexity
                </Label>
                <Select
                  value={projectComplexity}
                  onValueChange={setProjectComplexity}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select complexity">
                      {(value: string | null) =>
                        getOptionLabel(
                          complexityOptions,
                          value,
                          "Select complexity",
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {complexityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Desired Timeline
                </Label>
                <Select
                  value={desiredTimeline}
                  onValueChange={setDesiredTimeline}
                >
                  <SelectTrigger className="h-12 border-orange-200 bg-orange-50/10 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/30 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 md:text-base dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-slate-100 dark:hover:bg-orange-950/35 dark:focus:bg-slate-900">
                    <SelectValue placeholder="Select timeline">
                      {(value: string | null) =>
                        getOptionLabel(
                          timelineOptions,
                          value,
                          "Select timeline",
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {timelineOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/60 via-white to-orange-50/40 p-5 shadow-lg shadow-orange-200/20 dark:border-orange-800/60 dark:from-orange-950/35 dark:via-slate-900 dark:to-orange-950/20 dark:shadow-none">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-[#ea580c]">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  AI analysis typically takes{" "}
                  <span className="ml-1 font-bold text-[#ea580c]">
                    30-45 seconds
                  </span>{" "}
                  to generate.
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-[#ea580c] to-[#d04e0a] px-8 text-base font-bold text-white shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60 hover:from-[#d04e0a] hover:to-[#b83d08] disabled:cursor-not-allowed disabled:from-orange-300 disabled:to-orange-300 disabled:shadow-none transition-all sm:w-auto md:text-lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin md:h-6 md:w-6" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  )}
                  {isSubmitting ? "Initiating Analysis..." : "Analyze Idea"}
                </Button>
              </div>

              {!canSubmit && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
                  Enter at least 4 characters for title and 30 characters for
                  description to run analysis.
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-50/70 px-4 py-3 text-sm font-semibold text-red-700 shadow-md shadow-red-200/30 dark:border-red-900/60 dark:from-red-950/50 dark:to-red-950/30 dark:text-red-300 dark:shadow-none">
                  ⚠️ {errorMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <div className="app-surface rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white p-6 shadow-lg shadow-emerald-100/30 dark:border-emerald-900/60 dark:from-emerald-950/25 dark:to-slate-900 dark:shadow-none">
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              What We Analyze
            </h3>
            <div className="mt-5 space-y-3.5">
              <div className="flex items-start gap-4 rounded-xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm hover:shadow-md transition-all dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900 dark:shadow-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Market Validation
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1 dark:text-slate-300">
                    Demand signals, trend trajectory, and competitor intensity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-sm hover:shadow-md transition-all dark:border-blue-900/60 dark:from-blue-950/30 dark:to-slate-900 dark:shadow-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60">
                  <Terminal className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Technical Feasibility
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1 dark:text-slate-300">
                    Build complexity, stack fit, and team readiness.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-2 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-4 shadow-sm hover:shadow-md transition-all dark:border-purple-900/60 dark:from-purple-950/25 dark:to-slate-900 dark:shadow-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/60">
                  <CircleDollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Revenue Opportunity
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1 dark:text-slate-300">
                    Monetization fit, expansion potential, and risk indicators.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl border-2 border-orange-100 bg-gradient-to-br from-orange-50/20 to-white p-6 shadow-lg shadow-orange-100/20 dark:border-orange-900/60 dark:from-orange-950/25 dark:to-slate-900 dark:shadow-none">
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Readiness Snapshot
            </h3>
            <div className="mt-5 space-y-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <p className="inline-flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/40 px-3.5 py-2.5 w-full transition-all hover:border-orange-200 hover:bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/30 dark:hover:bg-orange-950/45">
                <Rocket className="h-5 w-5 text-[#ea580c] flex-shrink-0" />
                <span>Scope your MVP outcome clearly</span>
              </p>
              <p className="inline-flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/40 px-3.5 py-2.5 w-full transition-all hover:border-orange-200 hover:bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/30 dark:hover:bg-orange-950/45">
                <Users className="h-5 w-5 text-[#ea580c] flex-shrink-0" />
                <span>Map user persona and buyer intent</span>
              </p>
              <p className="inline-flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/40 px-3.5 py-2.5 w-full transition-all hover:border-orange-200 hover:bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/30 dark:hover:bg-orange-950/45">
                <BarChart3 className="h-5 w-5 text-[#ea580c] flex-shrink-0" />
                <span>Validate traction assumptions with data</span>
              </p>
              <p className="inline-flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/40 px-3.5 py-2.5 w-full transition-all hover:border-orange-200 hover:bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/30 dark:hover:bg-orange-950/45">
                <ShieldCheck className="h-5 w-5 text-[#ea580c] flex-shrink-0" />
                <span>Surface risk before implementation</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
