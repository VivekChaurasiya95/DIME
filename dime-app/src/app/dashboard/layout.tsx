"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
  Orbit,
  Database,
  BookOpen,
  FileText,
  Settings,
  Bell,
  Sun,
  Menu,
  X,
  Moon,
} from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const settingsActive = pathname === "/dashboard/settings";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.document.documentElement.classList.contains("dark");
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleTheme = () => {
    const rootElement = window.document.documentElement;
    const nextValue = !isDark;
    rootElement.classList.toggle("dark", nextValue);
    setIsDark(nextValue);
  };

  const isNavActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Idea Analysis", href: "/dashboard/analyzer", icon: Lightbulb },
    {
      name: "Market Analysis",
      href: "/dashboard/market-analysis",
      icon: TrendingUp,
    },
    {
      name: "Opportunity Matrix",
      href: "/dashboard/opportunities",
      icon: Orbit,
    },
    { name: "Dataset Explorer", href: "/dashboard/datasets", icon: Database },
  ];

  const workspaceNav = [
    { name: "Idea Workspace", href: "/dashboard/workspace", icon: BookOpen },
    { name: "Notes", href: "/dashboard/notes", icon: FileText },
  ];

  const sidebarContent = (
    <>
      <div className="h-20 flex items-center px-6">
        <div className="flex items-center gap-3 text-[#ea580c]">
          <svg viewBox="0 0 100 100" fill="currentColor" className="w-8 h-8">
            <path d="M20 20 h25 v30 h35 v30 h-60 z" />
          </svg>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">
            DIME
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = isNavActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#ea580c] text-white"
                    : "text-slate-600 hover:bg-orange-50 hover:text-[#ea580c] dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${isActive ? "text-orange-200" : "text-slate-400"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div>
          <h4 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            WORKSPACE
          </h4>
          <nav className="space-y-1">
            {workspaceNav.map((item) => {
              const isActive = isNavActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#ea580c] text-white"
                      : "text-slate-600 hover:bg-orange-50 hover:text-[#ea580c] dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 mr-3 ${isActive ? "text-orange-200" : "text-slate-400"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/dashboard/settings"
          className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            settingsActive
              ? "bg-[#ea580c] text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Settings
            className={`w-5 h-5 mr-3 ${
              settingsActive ? "text-orange-200" : "text-slate-400"
            }`}
          />
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#fafafa] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden lg:flex">
        {sidebarContent}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileSidebarOpen(false)}
          ></div>
          <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Navigation
              </p>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-10">
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-md"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-[#ea580c] ml-4">
              <svg
                viewBox="0 0 100 100"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path d="M20 20 h25 v30 h35 v30 h-60 z" />
              </svg>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                DIME
              </span>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 max-w-xl">
            <SearchInput />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              type="button"
              suppressHydrationWarning
              onClick={toggleTheme}
              className="text-slate-400 hover:text-slate-600 transition-colors hidden sm:block"
            >
              {isDark ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="text-slate-400 hover:text-slate-600 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 z-20">
                  <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Notifications
                  </p>
                  <div className="mt-3 space-y-2">
                    <Link
                      href="/dashboard/notes"
                      className="block rounded-lg border border-slate-100 p-2 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        New analysis result is ready
                      </p>
                      <p className="text-xs text-slate-500">
                        Open Notes to review highlights.
                      </p>
                    </Link>
                    <Link
                      href="/dashboard/market-analysis"
                      className="block rounded-lg border border-slate-100 p-2 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        Market trend shifted
                      </p>
                      <p className="text-xs text-slate-500">
                        Visit Market Analysis to see details.
                      </p>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-sm">
                <span className="font-semibold text-slate-900 leading-tight">
                  Vivek
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Pro Researcher
                </span>
              </div>
              <Avatar className="w-10 h-10 border border-slate-200">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>VC</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
