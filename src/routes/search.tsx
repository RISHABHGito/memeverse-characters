import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SearchX, Search as SearchIcon } from "lucide-react";
import { searchAll } from "@/lib/memes.functions";
import { CharacterCircle } from "@/components/character-circle";
import { MemeCard } from "@/components/meme-card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({
    meta: [
      { title: "Search — MemeVerse" },
      { name: "description", content: "Search memes by character name, nickname, or plain description. Typo-tolerant, meaning-aware search." },
      { property: "og:title", content: "Search — MemeVerse" },
      { property: "og:description", content: "Search memes by character name, nickname, or plain description." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchAll({ data: { q } }),
    enabled: q.trim().length > 0,
  });

  return (
    <div className="pt-8">
      <form
        className="relative mx-auto max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: input } });
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          placeholder='Try "babu bhaiya", "angry office guy", "hera feri"…'
          className="h-12 w-full rounded-full border border-input bg-secondary/50 pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </form>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Typos, nicknames, or plain descriptions — we get it.
      </p>

      {q.trim().length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">Type something above to search every character and meme.</p>
      ) : isFetching && !data ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="mt-10">
          {data.characters.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Characters</h2>
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
                {data.characters.map((c) => (
                  <CharacterCircle key={c.id} character={c} size="lg" />
                ))}
              </div>
            </section>
          )}
          <section className="mt-8">
            <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Memes</h2>
            {data.memes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <SearchX className="h-8 w-8" />
                <p className="text-sm">No memes matched. Try a character name or a different description.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.memes.map((m) => (
                  <MemeCard key={m.id} meme={m} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
