import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Sparkles, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkBase =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors";

  return (
    <div className="min-h-screen">
      <header className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="font-display flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" /> Third Eye Care
          </div>

          <nav className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            <Link
              to="/dashboard"
              className={`${linkBase} opacity-80 hover:opacity-100`}
              activeProps={{ className: `${linkBase} bg-background text-foreground opacity-100` }}
            >
              <UserPlus className="h-4 w-4" /> Add patient
            </Link>
            <Link
              to="/assistant"
              className={`${linkBase} opacity-80 hover:opacity-100`}
              activeProps={{ className: `${linkBase} bg-background text-foreground opacity-100` }}
            >
              <Sparkles className="h-4 w-4" /> AI assistant
            </Link>
          </nav>

          <Button variant="secondary" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}