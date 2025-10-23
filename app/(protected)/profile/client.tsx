"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Loader2, MoonStar, NotebookText, SunMedium, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Profile {
  name: string;
  email: string;
  avatarUrl?: string;
  xp: number;
  badges: string[];
  preferences: { theme: string; notifications: boolean };
}

export default function ProfileClient() {
  const { setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", theme: "system", notifications: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) throw new Error("Unable to load profile");
        const data = await response.json();
        setProfile(data.profile);
        setForm({
          name: data.profile.name ?? "",
          theme: data.profile.preferences?.theme ?? "system",
          notifications: data.profile.preferences?.notifications ?? true,
        });
        setTheme(data.profile.preferences?.theme ?? "system");
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [setTheme]);

  const updateProfile = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Unable to update profile");
    }
    const data = await response.json();
    setProfile(data.profile);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        name: form.name,
        preferences: { theme: form.theme, notifications: form.notifications },
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateProfile({ avatar: reader.result });
        toast.success("Avatar updated");
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your AI Mentor identity, theme, and notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10">
              {profile?.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="Avatar" fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">{profile?.name?.[0] ?? "A"}</div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload a new avatar</p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold">
                <UploadCloud className="h-4 w-4" />
                Change Avatar
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} readOnly disabled />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 p-4">
              <p className="text-sm font-medium">Theme</p>
              <div className="mt-3 space-y-2">
                {[
                  { value: "light", label: "Light", icon: <SunMedium className="h-4 w-4" /> },
                  { value: "dark", label: "Dark", icon: <MoonStar className="h-4 w-4" /> },
                  { value: "system", label: "System", icon: <NotebookText className="h-4 w-4" /> },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setForm((prev) => ({ ...prev, theme: option.value })); setTheme(option.value); }}
                    className={
                      "flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-2 text-sm transition hover:border-primary/50 " +
                      (form.theme === option.value ? "border-primary/60 bg-primary/10 text-primary" : "")
                    }
                  >
                    <span className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 p-4">
              <p className="text-sm font-medium">Notifications</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Learning streak updates</span>
                <Switch
                  checked={form.notifications}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, notifications: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>XP and badges earned through learning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="mt-2 text-3xl font-semibold">{profile?.xp ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Badges</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(profile?.badges?.length ?? 0) > 0 ? (
                  profile!.badges.map((badge) => <Badge key={badge}>{badge}</Badge>)
                ) : (
                  <span className="text-xs text-muted-foreground">Complete more activities to earn badges.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Data Controls</CardTitle>
            <CardDescription>Export or delete your AI Mentor data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use the buttons below to export your data or request deletion. Actions require support confirmation.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">Export Data</Button>
              <Button variant="ghost" className="flex-1 text-red-500 hover:text-red-400">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
