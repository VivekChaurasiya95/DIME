"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
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
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" defaultValue="Vivek" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                defaultValue="vivek@example.com"
                className="h-10"
              />
            </div>
            <Button className="h-10 rounded-lg bg-[#ea580c] text-white hover:bg-[#d04e0a]">
              Save Profile
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
