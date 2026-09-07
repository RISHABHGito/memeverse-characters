import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserCheck } from "lucide-react";
import { getCharacter, toggleFollow } from "@/lib/memes.functions";
import { MemeCard } from "@/components/meme-card";
import { Badge } from "@/components/ui/badge";

const characterQuery = (slug: string) =>
  queryOptions({
    queryKey: ["character", slug],
    queryFn: async () => {
      const res = await getCharacter({ data: { slug } });
      if (!res) throw notFound();
      return res;
    },
  });

export const Route = createFileRoute("/character/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(characterQuery(params.slug)),
  head: ({ loaderData }) => {
    const c = loaderData?.character;
    if (!c) return { meta: [{ title: "Character not found — MemeVerse" }] };
    const desc = c.bio ?? `${c.name} memes${c.origin ? ` from ${c.origin}` : ""} on MemeVerse.`;
    return {
      meta: [
        { title: `${c.name} memes — MemeVerse` },
        { name: "description", content: desc },
        { property: "og:title", content: `${c.name} memes — MemeVerse` },
        { property: "og:description", content: desc },
        ...(c.avatar_url?.startsWith("https://")
          ? [
              { property: "og:image", content: c.avatar_url },
              { name: "twitter:image", content: c.avatar_url },
            ]
          : []),
      ],
    };
  },
  component: CharacterPage,
});

function CharacterPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(characterQuery(slug));
  const navigate = useNavigate();
  const { character, aliases, approvedTags, memes } = data;
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(character.follower_count);

  const follow = async () => {
    try {
      const res = await toggleFollow({ data: { characterId: character.id } });
      setFollowing(res.following);
      setFollowers((n) => n + (res.following ? 1 : -1));
    } catch {
      toast("Sign in to follow characters", { action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) } });
    }
  };

  const allTags = [...new Set([...character.tags, ...approvedTags])];

  return (
    <div className="pt-10">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <span className="avatar-ring rounded-full p-1">
          {character.avatar_url ? (
            <img src={character.avatar_url} alt={character.name} className="h-28 w-28 rounded-full border-4 border-background object-cover" />
          ) : (
            <span className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-secondary font-display text-4xl">
              {character.name.slice(0, 1)}
            </span>
          )}
        </span>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-4xl uppercase leading-none">{character.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[character.origin, character.category, character.is_fictional ? "Fictional" : "Real person"].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm sm:justify-start">
            <span><strong className="font-display">{character.meme_count}</strong> memes</span>
            <span><strong className="font-display">{followers}</strong> followers</span>
          </div>
          {character.bio && <p className="mt-3 max-w-xl text-sm text-muted-foreground">{character.bio}</p>}
          {aliases.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Also known as: {aliases.join(", ")}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              onClick={follow}
              className={
                following
                  ? "flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-bold hover:bg-secondary"
                  : "flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              }
            >
              {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "Following" : "Follow"}
            </button>
          </div>
          {allTags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {allTags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Memes</h2>
        {memes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No approved memes yet — submit the first one!</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memes.map((m) => (
              <MemeCard key={m.id} meme={m} showCharacter={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
