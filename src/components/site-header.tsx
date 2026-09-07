import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Flame, LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionState } from "@/lib/memes.functions";

export function SiteHeader() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    getSessionState()
      .then((s) => setIsAdmin(s.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-1.5 font-display text-xl tracking-wide text-primary">
          <Flame className="h-5 w-5" />
          MEMEVERSE
        </Link>
        <form
          className="relative mx-auto w-full max-w-md flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q } });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search characters, memes, vibes…"
            className="h-9 w-full rounded-full border border-input bg-secondary/50 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </form>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/submit" className="flex items-center gap-1 rounded-full px-3 py-1.5 font-medium hover:bg-secondary">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Submit</span>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-accent hover:bg-secondary">
              <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 font-medium hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 font-bold text-primary-foreground hover:opacity-90">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
