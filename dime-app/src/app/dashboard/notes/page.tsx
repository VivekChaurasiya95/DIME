"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  CalendarDays,
  Clock3,
  Link2,
  Pin,
  Plus,
  Save,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NoteTone = "orange" | "blue" | "green" | "purple";

type StickyNote = {
  id: string;
  tone: NoteTone;
  category: string;
  title: string;
  content: string;
  isPinned: boolean;
  updatedAt: string;
};

type NotesResponse = {
  items: StickyNote[];
  total: number;
  categories: string[];
};

const toneClasses: Record<NoteTone, string> = {
  orange:
    "border-l-[3px] border-l-[#f97316] bg-[#fff6ef] ring-1 ring-orange-100/80",
  blue: "border-l-[3px] border-l-[#3b82f6] bg-[#f3f7ff] ring-1 ring-blue-100/80",
  green:
    "border-l-[3px] border-l-[#22c55e] bg-[#f2fcf5] ring-1 ring-green-100/80",
  purple:
    "border-l-[3px] border-l-[#a855f7] bg-[#faf5ff] ring-1 ring-purple-100/80",
};

const tagClasses: Record<NoteTone, string> = {
  orange: "bg-orange-100 text-orange-600",
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
};

const toneOptions: NoteTone[] = ["orange", "blue", "green", "purple"];

const dateRangeLabels: Record<string, string> = {
  all: "All Time",
  "7": "Last 7 Days",
  "30": "Last 30 Days",
  "90": "Last 90 Days",
};

const sortLabels: Record<string, string> = {
  updated: "Updated",
  oldest: "Oldest",
  title: "Title",
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / min))}m ago`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function NotesPage() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [categories, setCategories] = useState<string[]>(["All Notes"]);
  const [activeFilter, setActiveFilter] = useState("All Notes");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [dateRange, setDateRange] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    title: "",
    content: "",
    category: "General",
    tone: "orange" as NoteTone,
    isPinned: false,
  });

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams({
        category:
          activeFilter === "All Notes" ? "all" : activeFilter.toLowerCase(),
        search,
        sort: sortBy,
      });

      const response = await fetch(`/api/notes?${params.toString()}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load notes");
      }

      const payload = (await response.json()) as NotesResponse;
      setNotes(payload.items);
      setCategories(payload.categories);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load notes right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, search, sortBy]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const filteredByDate = useMemo(() => {
    if (dateRange === "all") {
      return notes;
    }

    const days = Number(dateRange);
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return notes.filter(
      (note) => new Date(note.updatedAt).getTime() >= threshold,
    );
  }, [dateRange, notes]);

  const resetDraft = () => {
    setDraft({
      title: "",
      content: "",
      category: "General",
      tone: "orange",
      isPinned: false,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const saveNote = async () => {
    try {
      const title = draft.title.trim();
      const content = draft.content.trim();

      if (title.length < 3 || content.length < 10) {
        setErrorMessage(
          "Title should be at least 3 chars and content at least 10 chars.",
        );
        return;
      }

      setSavingId(editingId ?? "new");
      setErrorMessage(null);

      const url = editingId ? `/api/notes/${editingId}` : "/api/notes";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to save note");
      }

      resetDraft();
      await loadNotes();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save note.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setSavingId(noteId);
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete note");
      }

      await loadNotes();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete note.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const togglePinned = async (note: StickyNote) => {
    try {
      setSavingId(note.id);
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update pin state");
      }

      await loadNotes();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update note.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (note: StickyNote) => {
    setEditingId(note.id);
    setDraft({
      title: note.title,
      content: note.content,
      category: note.category,
      tone: note.tone,
      isPinned: note.isPinned,
    });
    setIsFormOpen(true);
  };

  return (
    <div className="app-page space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="app-title">Sticky Board</h1>
          <p className="app-subtitle">
            Manage your thoughts and research items
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              setIsFormOpen((prev) => !prev);
              if (isFormOpen) {
                resetDraft();
              }
            }}
            className="h-11 rounded-xl bg-[#ea580c] px-4 text-white hover:bg-[#d04e0a]"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isFormOpen ? "Close" : "New Note"}
          </Button>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-11 w-[150px] rounded-xl border-slate-200 bg-white px-4 text-slate-700">
              <CalendarDays className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Date Range">
                {(value: string | null) =>
                  value
                    ? (dateRangeLabels[value] ?? "Date Range")
                    : "Date Range"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-11 w-[130px] rounded-xl border-slate-200 bg-white px-4 text-slate-700">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort">
                {(value: string | null) =>
                  value ? (sortLabels[value] ?? "Sort") : "Sort"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          suppressHydrationWarning
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes by title or content..."
          className="h-11 w-full rounded-xl border border-orange-200 bg-orange-50/20 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {categories.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveFilter(filter)}
              className={`h-8 rounded-full px-4 text-xs font-bold tracking-wide transition-colors ${
                isActive
                  ? "bg-[#ea580c] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter}
            </button>
          );
        })}

        <button
          type="button"
          suppressHydrationWarning
          onClick={() => setActiveFilter("All Notes")}
          className="inline-flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          aria-label="Reset filters"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4">
          <h3 className="text-lg font-black text-slate-900">
            {editingId ? "Edit Note" : "Create New Note"}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              suppressHydrationWarning
              value={draft.title}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Note title"
              className="h-11 rounded-lg border border-orange-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
            />

            <input
              type="text"
              suppressHydrationWarning
              value={draft.category}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Category"
              className="h-11 rounded-lg border border-orange-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
            />
          </div>

          <textarea
            suppressHydrationWarning
            value={draft.content}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, content: event.target.value }))
            }
            placeholder="Write your note content..."
            className="mt-3 min-h-[130px] w-full resize-y rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Select
              value={draft.tone}
              onValueChange={(value: NoteTone) =>
                setDraft((prev) => ({ ...prev, tone: value }))
              }
            >
              <SelectTrigger className="h-10 w-[130px] rounded-lg border-orange-200 bg-white">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() =>
                setDraft((prev) => ({ ...prev, isPinned: !prev.isPinned }))
              }
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                draft.isPinned
                  ? "border-orange-300 bg-orange-100 text-[#ea580c]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Pin className="mr-2 inline h-4 w-4" />
              {draft.isPinned ? "Pinned" : "Pin Note"}
            </button>

            <Button
              onClick={() => void saveNote()}
              disabled={
                savingId === "new" ||
                (editingId !== null && savingId === editingId)
              }
              className="h-10 rounded-lg bg-[#ea580c] px-4 text-white hover:bg-[#d04e0a]"
            >
              {savingId === "new" ||
              (editingId !== null && savingId === editingId) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>

            <Button
              variant="outline"
              onClick={resetDraft}
              className="h-10 rounded-lg border-slate-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 min-[1700px]:grid-cols-4">
        {isLoading && (
          <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
            Loading notes...
          </div>
        )}

        {!isLoading && filteredByDate.length === 0 && (
          <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
            No notes found for the current filters.
          </div>
        )}

        {filteredByDate.map((note) => (
          <article
            key={note.id}
            className={`min-h-[255px] rounded-2xl p-5 ${toneClasses[note.tone]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tagClasses[note.tone]}`}
              >
                {note.category}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => void togglePinned(note)}
                  className={`rounded-full p-1 ${note.isPinned ? "text-[#ea580c]" : "text-slate-400"}`}
                  aria-label="Pin note"
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => startEdit(note)}
                  className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Edit note"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => void deleteNote(note.id)}
                  className="rounded-full p-1 text-slate-400 hover:text-red-600"
                  aria-label="Delete note"
                >
                  {savingId === note.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <h2 className="mt-5 text-2xl font-black leading-tight tracking-tight text-slate-900">
              {note.title}
            </h2>
            <p className="mt-3 overflow-hidden text-[15px] font-medium leading-7 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
              {note.content}
            </p>
            <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTime(note.updatedAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                {note.isPinned ? "Pinned" : "Shared"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
