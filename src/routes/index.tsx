import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, TrendingUp, Sparkles } from "lucide-react";
import { getFeed } from "@/lib/memes.functions";
import { CharacterCircle } from "@/components/character-circle";
import { MemeCard } from "@/components/meme-card";

const feedQuery = queryOptions({ queryKey: ["feed"], queryFn: () => getFeed() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(feedQuery),
  head: () => ({
    meta: [
      { title: "MemeVerse — every meme, by character" },
      { name: "description", content: "Trending meme characters and their funniest moments. Search any character, watch in a floating player, submit your finds." },
      { property: "og:title", content: "MemeVerse — every meme, by character" },
      { property: "og:description", content: "Trending meme characters and their funniest moments." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { data } = useSuspenseQuery(feedQuery);
  const withMemes = data.characters.filter((c) => c.memes.length > 0);

  return (
    <div className="pt-8">
      <section className="text-center">
        <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl">
          Every meme has a <span className="text-primary text-glow-primary">character</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Characters have the accounts. Nobody runs them. Scroll their funniest moments, follow your favorites, submit what we missed.
        </p>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg uppercase tracking-wide">Trending characters</h2>
        </div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {data.characters.map((c) => (
            <CharacterCircle key={c.id} character={c} />
          ))}
        </div>
      </section>

      {withMemes.slice(0, 6).map((c) => (
        <section key={c.id} className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <Link to="/character/$slug" params={{ slug: c.slug }} className="group flex items-center gap-3">
              {c.avatar_url && <img src={c.avatar_url} alt={c.name} className="h-9 w-9 rounded-full object-cover" />}
              <div>
                <h2 className="font-display text-lg uppercase tracking-wide group-hover:text-primary">{c.name}</h2>
                {c.origin && <p className="text-xs text-muted-foreground">{c.origin}</p>}
              </div>
            </Link>
            <Link
              to="/character/$slug"
              params={{ slug: c.slug }}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {c.memes.slice(0, 8).map((m) => (
              <MemeCard key={m.id} meme={m} showCharacter={false} wide />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg uppercase tracking-wide">Fresh drops</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.freshMemes.map((m) => (
            <MemeCard key={m.id} meme={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
