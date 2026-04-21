"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
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
  Camera,
  PencilLine,
  Calendar,
  ShieldCheck,
  Sparkles,
  LogOut,
  Check,
} from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from "@/lib/user-profile";

type EditableProfile = {
  name: string;
  email: string;
  image: string;
};

type ProfileOverview = {
  joinedAt: string;
  lastUpdatedAt: string;
  isEmailVerified: boolean;
  signInMethods: string[];
  profileCompletion: number;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profile, setProfile] = useState<EditableProfile>({
    name: "",
    email: "",
    image: "",
  });
  const [profileForm, setProfileForm] = useState<EditableProfile>({
    name: "",
    email: "",
    image: "",
  });
  const [profileOverview, setProfileOverview] = useState<ProfileOverview>({
    joinedAt: "",
    lastUpdatedAt: "",
    isEmailVerified: false,
    signInMethods: [],
    profileCompletion: 0,
  });
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [emailCodeRequestedFor, setEmailCodeRequestedFor] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailCodeStatus, setEmailCodeStatus] = useState("");

  const displayName = getUserDisplayName(
    profile.name || session?.user?.name,
    profile.email || session?.user?.email,
  );
  const displayEmail =
    profile.email || session?.user?.email || "Signed in user";
  const avatarSrc = getUserAvatarUrl(
    profile.image || session?.user?.image,
    profile.email || session?.user?.email,
    profile.name || session?.user?.name,
  );
  const avatarInitials = getUserInitials(displayName);
  const profileFormAvatarSrc = getUserAvatarUrl(
    profileForm.image,
    profileForm.email,
    profileForm.name,
  );
  const profileFormDisplayName = getUserDisplayName(
    profileForm.name,
    profileForm.email,
  );

  const formatDateLabel = (value: string) => {
    if (!value) {
      return "Not available";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return "Not available";
    }

    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    const nextProfile: EditableProfile = {
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      image: session?.user?.image ?? "",
    };

    setProfile(nextProfile);
    setProfileForm(nextProfile);
  }, [session?.user?.name, session?.user?.email, session?.user?.image]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        const response = await fetch("/api/profile", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Could not load profile");
        }

        const payload = (await response.json()) as {
          user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
          };
          overview?: {
            joinedAt?: string;
            lastUpdatedAt?: string;
            isEmailVerified?: boolean;
            signInMethods?: string[];
            profileCompletion?: number;
          };
        };

        const nextProfile: EditableProfile = {
          name: payload.user.name ?? "",
          email: payload.user.email ?? "",
          image: payload.user.image ?? "",
        };

        if (isActive) {
          setProfile(nextProfile);
          setProfileForm(nextProfile);
          setProfileOverview({
            joinedAt: payload.overview?.joinedAt ?? "",
            lastUpdatedAt: payload.overview?.lastUpdatedAt ?? "",
            isEmailVerified: payload.overview?.isEmailVerified ?? false,
            signInMethods: payload.overview?.signInMethods ?? [],
            profileCompletion: payload.overview?.profileCompletion ?? 0,
          });
        }
      } catch {
        if (isActive) {
          setProfileError("Unable to load your profile right now.");
        }
      } finally {
        if (isActive) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [session?.user?.id]);

  // ---- Notifications ----

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });

      if (!response.ok) return;

      const payload = (await response.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };

      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
    } catch {
      // silent — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);

    return () => clearInterval(interval);
  }, [session?.user?.id, fetchNotifications]);

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (photoPreviewOpen) {
        setPhotoPreviewOpen(false);
        return;
      }

      if (profileOpen) {
        setProfileOpen(false);
        setPhotoPreviewOpen(false);
        setProfileEditMode(false);
        setEmailCodeRequestedFor("");
        setEmailVerificationCode("");
        setEmailCodeStatus("");
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [photoPreviewOpen, profileOpen]);

  const closeProfilePanel = () => {
    setProfileOpen(false);
    setPhotoPreviewOpen(false);
    setProfileEditMode(false);
    setEmailCodeRequestedFor("");
    setEmailVerificationCode("");
    setEmailCodeStatus("");
  };

  const normalizeEmailValue = (value: string) => value.trim().toLowerCase();

  const requestEmailCode = async (nextEmail: string) => {
    const response = await fetch("/api/profile/email/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nextEmail }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Unable to send verification code");
    }

    const payload = (await response.json()) as {
      message?: string;
    };

    return payload.message ?? "Verification code sent.";
  };

  const handleProfilePhotoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Profile photo must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileForm((prev) => ({ ...prev, image: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setEmailCodeStatus("");

    try {
      setProfileSaving(true);

      const nextEmail = normalizeEmailValue(profileForm.email);
      const currentEmail = normalizeEmailValue(profile.email);
      const isEmailChanging = nextEmail !== currentEmail;

      if (isEmailChanging && emailCodeRequestedFor !== nextEmail) {
        const statusMessage = await requestEmailCode(nextEmail);
        setEmailCodeRequestedFor(nextEmail);
        setEmailVerificationCode("");
        setEmailCodeStatus(statusMessage);
        setProfileError("");
        return;
      }

      if (isEmailChanging && !/^\d{6}$/.test(emailVerificationCode.trim())) {
        setProfileError(
          "Enter the 6-digit verification code sent to your new email.",
        );
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileForm,
          ...(isEmailChanging
            ? { emailVerificationCode: emailVerificationCode.trim() }
            : {}),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        setProfileError(message || "Could not update profile");
        return;
      }

      const payload = (await response.json()) as {
        user: {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        };
        overview?: {
          joinedAt?: string;
          lastUpdatedAt?: string;
          isEmailVerified?: boolean;
          signInMethods?: string[];
          profileCompletion?: number;
        };
      };

      const nextProfile: EditableProfile = {
        name: payload.user.name ?? "",
        email: payload.user.email ?? "",
        image: payload.user.image ?? "",
      };

      setProfile(nextProfile);
      setProfileForm(nextProfile);
      setProfileOverview({
        joinedAt: payload.overview?.joinedAt ?? profileOverview.joinedAt,
        lastUpdatedAt:
          payload.overview?.lastUpdatedAt ?? profileOverview.lastUpdatedAt,
        isEmailVerified:
          payload.overview?.isEmailVerified ?? profileOverview.isEmailVerified,
        signInMethods:
          payload.overview?.signInMethods ?? profileOverview.signInMethods,
        profileCompletion:
          payload.overview?.profileCompletion ??
          profileOverview.profileCompletion,
      });
      setProfileEditMode(false);
      setEmailCodeRequestedFor("");
      setEmailVerificationCode("");
      setEmailCodeStatus("");
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      if (error instanceof Error && error.message) {
        setProfileError(error.message);
      } else {
        setProfileError(
          "Could not update profile right now. Please try again.",
        );
      }
    } finally {
      setProfileSaving(false);
    }
  };

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

  const normalizedProfileEmail = normalizeEmailValue(profile.email);
  const normalizedFormEmail = normalizeEmailValue(profileForm.email);
  const isEmailChangePending = normalizedFormEmail !== normalizedProfileEmail;
  const needsVerificationCodeInput =
    profileEditMode &&
    isEmailChangePending &&
    emailCodeRequestedFor === normalizedFormEmail;

  const profilePanel = (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
            Profile Workspace
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {profileFormDisplayName}
          </h2>
        </div>
        <button
          type="button"
          suppressHydrationWarning
          onClick={closeProfilePanel}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        onSubmit={handleProfileSave}
      >
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setPhotoPreviewOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <Avatar className="h-16 w-16 border border-slate-200 dark:border-slate-700">
                <AvatarImage
                  src={profileFormAvatarSrc}
                  alt={profileFormDisplayName}
                />
                <AvatarFallback>
                  {getUserInitials(profileFormDisplayName)}
                </AvatarFallback>
              </Avatar>
            </button>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                    profileEditMode
                      ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Upload Photo
                  <input
                    type="file"
                    suppressHydrationWarning
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePhotoUpload}
                    disabled={!profileEditMode}
                  />
                </label>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click your profile image to open full preview. Upload is enabled
                only in edit mode.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Display Name
          </label>
          <input
            type="text"
            suppressHydrationWarning
            value={profileForm.name}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            readOnly={!profileEditMode}
            className={`h-10 w-full rounded-md border px-3 text-sm outline-none ${
              profileEditMode
                ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-200"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Email Address
          </label>
          <input
            type="email"
            suppressHydrationWarning
            value={profileForm.email}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                email: event.target.value,
              }))
            }
            readOnly={!profileEditMode}
            className={`h-10 w-full rounded-md border px-3 text-sm outline-none ${
              profileEditMode
                ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-200"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Profile Photo URL (optional)
          </label>
          <input
            type="url"
            suppressHydrationWarning
            value={profileForm.image}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                image: event.target.value,
              }))
            }
            placeholder="https://..."
            readOnly={!profileEditMode}
            className={`h-10 w-full rounded-md border px-3 text-sm outline-none ${
              profileEditMode
                ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-200"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          />
        </div>

        {profileEditMode &&
          isEmailChangePending &&
          !needsVerificationCodeInput && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              Saving this profile will first send a verification code to your
              new email.
            </div>
          )}

        {needsVerificationCodeInput && (
          <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Enter verification code sent to {profileForm.email.trim()}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                suppressHydrationWarning
                inputMode="numeric"
                maxLength={6}
                value={emailVerificationCode}
                onChange={(event) =>
                  setEmailVerificationCode(
                    event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                  )
                }
                className="h-10 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm tracking-[0.22em] text-slate-900 dark:text-slate-100 outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-200"
                placeholder="000000"
              />
              <button
                type="button"
                suppressHydrationWarning
                onClick={async () => {
                  setProfileError("");
                  setProfileSuccess("");

                  try {
                    const statusMessage =
                      await requestEmailCode(normalizedFormEmail);
                    setEmailCodeStatus(statusMessage);
                  } catch (error) {
                    if (error instanceof Error && error.message) {
                      setProfileError(error.message);
                    } else {
                      setProfileError("Unable to resend verification code.");
                    }
                  }
                }}
                className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Resend
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Account Snapshot
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Member since {formatDateLabel(profileOverview.joinedAt)}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              Email{" "}
              {profileOverview.isEmailVerified ? "verified" : "not verified"}
            </p>
            <p className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-400" />
              Sign-in methods:{" "}
              {profileOverview.signInMethods.join(", ") || "Email and password"}
            </p>
            <p>Last updated {formatDateLabel(profileOverview.lastUpdatedAt)}</p>
            <div className="pt-1">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Profile completion</span>
                <span>{profileOverview.profileCompletion}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-[#ea580c] transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, profileOverview.profileCompletion))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {profileLoading && (
          <p className="text-xs font-medium text-slate-500">
            Syncing profile...
          </p>
        )}

        {emailCodeStatus && (
          <p className="text-xs font-semibold text-blue-600">
            {emailCodeStatus}
          </p>
        )}

        {profileError && (
          <p className="text-xs font-semibold text-red-600">{profileError}</p>
        )}

        {profileSuccess && (
          <p className="text-xs font-semibold text-emerald-600">
            {profileSuccess}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            suppressHydrationWarning
            onClick={closeProfilePanel}
            className="h-9 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Close
          </button>

          {!profileEditMode && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setProfileError("");
                setProfileSuccess("");
                setEmailCodeStatus("");
                setEmailVerificationCode("");
                setEmailCodeRequestedFor("");
                setProfileEditMode(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#ea580c] px-3 text-xs font-semibold text-white hover:bg-[#d04e0a]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit Profile Details
            </button>
          )}

          {profileEditMode && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setProfileForm(profile);
                setProfileEditMode(false);
                setEmailCodeRequestedFor("");
                setEmailVerificationCode("");
                setEmailCodeStatus("");
                setProfileError("");
                setProfileSuccess("");
              }}
              className="h-9 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel Edit
            </button>
          )}

          {profileEditMode && (
            <button
              type="submit"
              suppressHydrationWarning
              disabled={profileSaving}
              className="h-9 rounded-md bg-[#ea580c] px-3 text-xs font-semibold text-white hover:bg-[#d04e0a] disabled:opacity-60"
            >
              {profileSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>

        {/* Logout */}
        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md border border-red-200 dark:border-red-900/50 px-3 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="flex h-screen bg-[#fafafa] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      <aside className="w-64 hidden lg:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col overflow-hidden">
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

      <div className="flex-1 min-w-0 flex">
        <motion.div
          className="min-w-0 flex-1 flex flex-col"
          animate={{ x: profileOpen ? -14 : 0 }}
          transition={{ type: "spring", stiffness: 230, damping: 28 }}
        >
          <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-10">
            <div className="flex min-w-0 items-center gap-2 lg:flex-1">
              <div className="flex items-center lg:hidden">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-md"
                  aria-label="Open navigation"
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
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100">
                    DIME
                  </span>
                </div>
              </div>

              <div className="hidden lg:flex min-w-0 flex-1 max-w-xl">
                <SearchInput />
              </div>
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
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-slate-900 px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-3 z-20 max-h-[400px] overflow-y-auto">
                    <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                    </p>
                    <div className="mt-3 space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            suppressHydrationWarning
                            onClick={() => {
                              if (!n.read) void markNotificationRead(n.id);
                            }}
                            className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                              n.read
                                ? "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900"
                                : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20"
                            } hover:bg-slate-50 dark:hover:bg-slate-800`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold ${n.read ? "text-slate-600 dark:text-slate-300" : "text-slate-900 dark:text-slate-100"}`}>
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-[#ea580c]" />
                              )}
                              {n.read && (
                                <Check className="mt-0.5 flex-shrink-0 w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  setProfileError("");
                  setProfileSuccess("");
                  setProfileForm(profile);
                  setPhotoPreviewOpen(false);
                  setProfileEditMode(false);
                  setEmailCodeRequestedFor("");
                  setEmailVerificationCode("");
                  setEmailCodeStatus("");
                  setProfileOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="hidden sm:flex min-w-0 flex-col items-end text-sm">
                  <span className="max-w-[170px] truncate font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {displayName}
                  </span>
                  <span className="max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {displayEmail}
                  </span>
                </div>
                <Avatar className="w-10 h-10 border border-slate-200 dark:border-slate-700">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback>{avatarInitials}</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </motion.div>

        <AnimatePresence initial={false}>
          {profileOpen && (
            <motion.aside
              className="hidden lg:flex h-full w-[18rem] 2xl:w-[20rem] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl flex-col"
              initial={{ x: "100%", opacity: 0.6 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={{ x: "100%", opacity: 0.6 }}
              transition={{ type: "spring", stiffness: 240, damping: 30 }}
            >
              {profilePanel}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              type="button"
              suppressHydrationWarning
              aria-label="Close profile panel"
              onClick={closeProfilePanel}
              className="absolute inset-0 bg-slate-900/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            ></motion.button>

            <motion.aside
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              {profilePanel}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {photoPreviewOpen && profileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              suppressHydrationWarning
              aria-label="Close photo preview"
              className="absolute inset-0 bg-slate-900/70"
              onClick={() => setPhotoPreviewOpen(false)}
            ></button>

            <motion.div
              className="relative w-full max-w-xl rounded-xl bg-white p-4 shadow-2xl border border-slate-200"
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Profile Photo Preview
                </h3>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setPhotoPreviewOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                <Image
                  src={profileFormAvatarSrc}
                  alt={profileFormDisplayName}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="rounded-md object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
