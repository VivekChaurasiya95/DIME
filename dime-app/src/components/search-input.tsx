"use client";

import { KeyboardEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const runSearch = () => {
    const value = query.trim();

    if (!value) {
      router.push("/dashboard/workspace");
      return;
    }

    router.push(`/dashboard/workspace?q=${encodeURIComponent(value)}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  };

  return (
    <div className="relative w-full max-w-[560px]">
      <button
        type="button"
        suppressHydrationWarning
        onClick={runSearch}
        aria-label="Run global search"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#ea580c]"
      >
        <Search className="w-4 h-4" />
      </button>
      <Input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search ideas, markets or datasets..."
        className="pl-10 h-10 w-full border-slate-200 bg-slate-50 rounded-lg text-sm focus-visible:ring-[#ea580c]"
      />
    </div>
  );
}
