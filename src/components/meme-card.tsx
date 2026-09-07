import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Eye, Heart, Play } from "lucide-react";
import { toast } from "sonner";
import { toggleInteraction, type MemeSummary } from "@/lib/memes.functions";
import { usePip } from "@/components/pip-player";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function MemeCard({
  meme,
  showCharacter = true,
  wide = false,
}: {
  meme: MemeSummary;
  showCharacter?: boolean;
  wide?: boolean;
}) {
  const pip = usePip();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(meme.like_count);

  const interact = async (kind: "like" | "save") => {
    try {
      const res = await toggleInteraction({ data: { memeId: meme.id, kind } });
      if (kind === "like") {
        setLiked(res.active);
        setLikeCount((c) => c + (res.active ? 1 : -1));
      } else {
        setSaved(res.active);
        toast.success(res.active ? "Saved" : "Removed from saves");
      }
    } catch {
      toast("Sign in to like and save memes", {
        action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) },
      });
    }
  };

  return (
    <article className={cn("group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50", wide ? "w-72 shrink-0" : "w-full")}>
      <button onClick={() => pip?.play(meme)} className="relative block w-full text-left" aria-label={`Play ${meme.title}`}>
        {meme.thumbnail_url ? (
          <img src={meme.thumbnail_url} alt={meme.title} loading="lazy" className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground">No thumbnail</div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {meme.platform === "x" ? "X" : meme.platform}
        </span>
      </button>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{meme.title}</h3>
        {showCharacter && meme.character_slug && (
          <Link
            to="/character/$slug"
            params={{ slug: meme.character_slug }}
            className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            {meme.character_avatar_url && (
              <img src={meme.character_avatar_url} alt={meme.character_name ?? ""} className="h-5 w-5 rounded-full object-cover" />
            )}
            <span className="font-medium">{meme.character_name}</span>
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {formatCount(meme.view_count)}
          </span>
          <button
            onClick={() => interact("like")}
            className={cn("flex items-center gap-1 transition-colors hover:text-accent", liked && "text-accent")}
            aria-label="Like"
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} /> {formatCount(likeCount)}
          </button>
          <button
            onClick={() => interact("save")}
            className={cn("flex items-center gap-1 transition-colors hover:text-primary", saved && "text-primary")}
            aria-label="Save"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
        </div>
      </div>
    </article>
  );
}
