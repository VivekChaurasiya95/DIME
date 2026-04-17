"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Check,
  Ellipsis,
  Filter,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";

type WorkspaceIdea = {
  id: string;
  label: string;
  status: string;
  title: string;
  excerpt: string;
  progress: number;
  accent: "orange" | "blue";
  updatedAt: string;
};

type WorkspaceTask = {
  id: string;
  title: string;
  meta: string;
  done: boolean;
  status: "TODO" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  ideaId: string | null;
};

type WorkspaceActivity = {
  id: string;
  text: string;
  time: string;
  highlight: boolean;
};

type WorkspacePayload = {
  tab: string;
  tabs: {
    all: number;
    validation: number;
    launch: number;
    archived: number;
  };
  ideas: WorkspaceIdea[];
  stats: {
    totalIdeas: number;
    validated: number;
  };
  mostPromising: {
    id: string;
    title: string;
    score: number;
  } | null;
  activity: WorkspaceActivity[];
  taskList: WorkspaceTask[];
  quickNote: {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
  } | null;
};

const fallback: WorkspacePayload = {
  tab: "all",
  tabs: {
    all: 0,
    validation: 0,
    launch: 0,
    archived: 0,
  },
  ideas: [],
  stats: {
    totalIdeas: 0,
    validated: 0,
  },
  mostPromising: null,
  activity: [],
  taskList: [],
  quickNote: null,
};

function IdeaProgress({
  value,
  accent,
}: {
  value: number;
  accent: "orange" | "blue";
}) {
  const indicatorClass = accent === "orange" ? "bg-[#ea580c]" : "bg-slate-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px] font-bold text-slate-500">
        <span>Validation Progress</span>
        <span
          className={accent === "orange" ? "text-[#ea580c]" : "text-slate-400"}
        >
          {value}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${indicatorClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [activeTab, setActiveTab] = useState("all");
  const [payload, setPayload] = useState<WorkspacePayload>(fallback);
  const [taskDraft, setTaskDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const query = new URLSearchParams({ tab: activeTab });
      const response = await fetch(
        `/api/workspace/overview?${query.toString()}`,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load workspace");
      }

      const data = (await response.json()) as WorkspacePayload;

      if (initialQuery) {
        const lowered = initialQuery.toLowerCase();
        data.ideas = data.ideas.filter((idea) =>
          `${idea.title} ${idea.excerpt}`.toLowerCase().includes(lowered),
        );
      }

      setPayload(data);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load workspace right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, initialQuery]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const tabs = useMemo(
    () => [
      { id: "all", label: `All Ideas (${payload.tabs.all})` },
      {
        id: "validation",
        label: `Validation Pipeline (${payload.tabs.validation})`,
      },
      { id: "launch", label: `Ready for Launch (${payload.tabs.launch})` },
      { id: "archived", label: `Archived (${payload.tabs.archived})` },
    ],
    [payload.tabs],
  );

  const addTask = async () => {
    try {
      const title = taskDraft.trim();

      if (title.length < 3) {
        setErrorMessage("Task title must be at least 3 characters.");
        return;
      }

      setIsTaskSaving(true);
      setErrorMessage(null);

      const response = await fetch("/api/workspace/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to add task");
      }

      setTaskDraft("");
      await loadWorkspace();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save task.",
      );
    } finally {
      setIsTaskSaving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, done: boolean) => {
    try {
      setUpdatingTaskId(taskId);
      const response = await fetch(`/api/workspace/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: done ? "DONE" : "TODO",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update task");
      }

      await loadWorkspace();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update task.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      setUpdatingTaskId(taskId);
      const response = await fetch(`/api/workspace/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete task");
      }

      await loadWorkspace();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete task.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="app-page">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">
                  Workspace <span className="mx-1 text-slate-300">&gt;</span>{" "}
                  <span className="text-[#ea580c]">Innovations</span>
                </p>
                <h1 className="app-title mt-1 leading-[1.06]">Active Ideas</h1>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => void loadWorkspace()}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-700"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={() => router.push("/dashboard/analyzer")}
                  className="h-10 rounded-xl bg-[#ea580c] px-5 font-bold text-white hover:bg-[#d04e0a]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Idea
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-7 border-b border-slate-100 pb-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative pb-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-[#ea580c]"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#ea580c]" />
                    )}
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {isLoading && payload.ideas.length === 0 && (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  Loading workspace ideas...
                </div>
              )}

              {!isLoading && payload.ideas.length === 0 && (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  No ideas found for this workspace tab.
                </div>
              )}

              {payload.ideas.map((idea) => (
                <article
                  key={idea.id}
                  className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                        {idea.label}
                      </span>
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        {idea.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      suppressHydrationWarning
                      className="text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="Idea options"
                      onClick={() =>
                        router.push(
                          `/dashboard/analyzer/results?ideaId=${idea.id}`,
                        )
                      }
                    >
                      <Ellipsis className="h-4 w-4" />
                    </button>
                  </div>

                  <h2 className="mt-4 text-[30px] font-black leading-[1.08] tracking-tight text-slate-900">
                    {idea.title}
                  </h2>
                  <p className="mt-2 overflow-hidden text-[15px] font-medium leading-7 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {idea.excerpt}
                  </p>

                  <div className="mt-4">
                    <IdeaProgress value={idea.progress} accent={idea.accent} />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">
                      Updated recently
                    </p>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() =>
                        router.push(
                          `/dashboard/analyzer/results?ideaId=${idea.id}`,
                        )
                      }
                      className={`text-sm font-bold ${
                        idea.accent === "orange"
                          ? "text-[#ea580c]"
                          : "text-slate-500"
                      }`}
                    >
                      View Details {"->"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_250px]">
              <article className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="text-[24px] font-black tracking-tight text-slate-900">
                    Tasks
                  </h3>
                  <button
                    type="button"
                    suppressHydrationWarning
                    className="text-xs font-bold text-[#ea580c]"
                    onClick={() => router.push("/dashboard/notes")}
                  >
                    View in Notes
                  </button>
                </div>

                <div className="px-4 py-2">
                  {payload.taskList.length === 0 && (
                    <div className="py-3 text-sm font-medium text-slate-500">
                      No tasks yet.
                    </div>
                  )}
                  {payload.taskList.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() =>
                          void updateTaskStatus(task.id, !task.done)
                        }
                        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                          task.done
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        {updatingTaskId === task.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[15px] font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {task.meta}
                        </p>
                      </div>
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => void deleteTask(task.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-slate-100 p-3">
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={taskDraft}
                    onChange={(event) => setTaskDraft(event.target.value)}
                    placeholder="Add task for current workspace"
                    className="h-10 rounded-lg border border-orange-200 bg-orange-50/20 px-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
                  />
                  <Button
                    onClick={() => void addTask()}
                    disabled={isTaskSaving}
                    className="h-10 rounded-lg bg-[#ea580c] px-3 font-semibold text-white hover:bg-[#d04e0a]"
                  >
                    {isTaskSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </article>

              <article className="rounded-2xl border border-orange-100 bg-[#fff8f3] p-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-[24px] font-black leading-tight tracking-tight text-slate-900">
                    Quick Notes
                  </h3>
                  <span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">
                    {payload.quickNote
                      ? `Updated ${payload.quickNote.updatedAt}`
                      : "No notes yet"}
                  </span>
                </div>
                <blockquote className="mt-4 rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm italic leading-7 text-slate-600">
                  {payload.quickNote
                    ? payload.quickNote.content
                    : "Capture your first strategic note to share context with your team."}
                </blockquote>
                <p className="mt-3 text-xs font-medium text-slate-400">
                  {payload.quickNote
                    ? payload.quickNote.title
                    : "Shared notes appear here"}
                </p>
              </article>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="text-2xl font-black tracking-tight text-slate-900">
              Workspace Stats
            </h4>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Ideas
                </p>
                <p className="mt-1 text-[34px] font-black leading-none text-slate-900">
                  {payload.stats.totalIdeas}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Validated
                </p>
                <p className="mt-1 text-[34px] font-black leading-none text-slate-900">
                  {String(payload.stats.validated).padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Most Promising Idea
              </p>
              <div className="mt-2 h-24 rounded-2xl bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.42),rgba(2,6,23,0.95)_45%),linear-gradient(120deg,#0f172a,#075985)]" />
              <h5 className="mt-2 text-sm font-black text-slate-900">
                {payload.mostPromising?.title ?? "No analyzed ideas yet"}
              </h5>
              <p className="text-xs font-medium text-amber-500">
                {payload.mostPromising
                  ? `★★★★★ ${payload.mostPromising.score / 10} Score`
                  : "Run analyzer to generate score"}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Recent Activity
              </p>
              <ul className="mt-2 space-y-3">
                {payload.activity.length === 0 && (
                  <li className="text-sm font-medium text-slate-500">
                    No activity yet.
                  </li>
                )}
                {payload.activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full ${
                        item.highlight ? "bg-[#ea580c]" : "bg-slate-300"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium leading-5 text-slate-700">
                        {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/market-analysis")}
              className="mt-5 h-10 w-full rounded-xl border-orange-200 bg-orange-50 text-[#ea580c] hover:bg-orange-100"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Quick Insights
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
