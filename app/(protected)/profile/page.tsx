'use client';

import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut, user: clerkUser } = useClerk();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!clerkUser) return;
    setDeleting(true);
    try {
      await clerkUser.delete();
      toast({ title: "Account deleted", description: "We hope to support you again in the future." });
    } catch (error) {
      console.error(error);
      toast({ title: "Unable to delete account", description: "Please contact support if the issue persists." });
      setDeleting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.firstName?.[0]?.toUpperCase() ?? user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Manage your AI Doctor preferences and account settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 overflow-hidden rounded-full border-4 border-white/70 shadow-lg">
            <AvatarImage src={user.imageUrl ?? undefined} alt={user.fullName ?? "User"} />
            <AvatarFallback className="flex h-full w-full items-center justify-center bg-brand text-2xl text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{user.fullName ?? 'AI Doctor member'}</p>
            <p className="text-sm text-slate-500">{user.primaryEmailAddress?.emailAddress}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">
                Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'today'}
              </span>
              <span className="rounded-full bg-success/10 px-3 py-1 text-success">Securely authenticated by Clerk</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/60 p-4 shadow-inner dark:bg-slate-900/60">
            <div>
              <Label className="text-base">Dark mode</Label>
              <p className="text-xs text-slate-500">Switch between light and dark for comfortable viewing.</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(value) => setTheme(value ? 'dark' : 'light')} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setTheme('light')} className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button variant="outline" onClick={() => setTheme('dark')} className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Dark
            </Button>
            <Button variant="outline" onClick={() => signOut({ redirectUrl: '/' })} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200/60 bg-red-50/40 dark:border-red-900/60 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="text-red-500">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deleting your account removes all consultations, goals, and reports. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
