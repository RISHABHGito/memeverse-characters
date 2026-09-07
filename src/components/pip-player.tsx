import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ExternalLink, Minus, PictureInPicture2, X } from "lucide-react";
import { recordView, type MemeSummary } from "@/lib/memes.functions";

interface PipState {
  meme: MemeSummary | null;
  minimized: boolean;
  play: (m: MemeSummary) => void;
  close: () => void;
  toggleMin: () => void;
}

const PipContext = createContext<PipState | null>(null);

export function usePip() {
  return useContext(PipContext);
}

export function PipPlayerProvider({ children }: { children: ReactNode }) {
  const [meme, setMeme] = useState<MemeSummary | null>(null);
  const [minimized, setMinimized] = useState(false);

  const play = useCallback((m: MemeSummary) => {
    setMeme(m);
    setMinimized(false);
    recordView({ data: { memeId: m.id } }).catch(() => {});
  }, []);
  const close = useCallback(() => setMeme(null), []);
  const toggleMin = useCallback(() => setMinimized((v) => !v), []);

  return (
    <PipContext.Provider value={{ meme, minimized, play, close, toggleMin }}>
      {children}
      {meme && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 bg-secondary/60 px-3 py-2">
            <PictureInPicture2 className="h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-xs font-semibold">{meme.title}</p>
            <button onClick={toggleMin} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={minimized ? "Expand" : "Minimize"}>
              <Minus className="h-4 w-4" />
            </button>
            <button onClick={close} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close player">
              <X className="h-4 w-4" />
            </button>
          </div>
          {!minimized &&
            (meme.platform === "youtube" && meme.external_id ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  key={meme.id}
                  src={`https://www.youtube.com/embed/${meme.external_id}?autoplay=1&rel=0`}
                  title={meme.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a href={meme.source_url} target="_blank" rel="noopener noreferrer" className="group relative block">
                {meme.thumbnail_url ? (
                  <img src={meme.thumbnail_url} alt={meme.title} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">No preview</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                    Open on {meme.platform === "x" ? "X" : meme.platform} <ExternalLink className="h-4 w-4" />
                  </span>
                </div>
              </a>
            ))}
        </div>
      )}
    </PipContext.Provider>
  );
}
