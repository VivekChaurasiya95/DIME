"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from "@/lib/user-profile";

export default function SettingsPage() {
  const { data: session } = useSession();
  const displayName = getUserDisplayName(
    session?.user?.name,
    session?.user?.email,
  );
  const email = session?.user?.email ?? "";
  const avatarUrl = getUserAvatarUrl(
    session?.user?.image,
    session?.user?.email,
    session?.user?.name,
  );
  const initials = getUserInitials(displayName);

  return (
    <div className="app-page-tight space-y-6">
      <div>
        <h1 className="app-title">Settings</h1>
        <p className="app-subtitle">
          Manage workspace preferences, notifications, and account details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <Avatar className="h-12 w-12 border border-slate-200">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {email || "No email on profile"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={displayName} className="h-10" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} className="h-10" readOnly />
            </div>
            <Button
              className="h-10 rounded-lg bg-[#ea580c] text-white hover:bg-[#d04e0a]"
              disabled
            >
              Synced From Account
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Email Notifications
                </p>
                <p className="text-xs text-slate-500">
                  Get updates when analysis completes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Weekly Digest
                </p>
                <p className="text-xs text-slate-500">
                  Receive market highlights every Monday
                </p>
              </div>
              <Switch />
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-lg border-slate-200"
            >
              Update Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
