import { Link } from "@tanstack/react-router";
import type { CharacterSummary } from "@/lib/memes.functions";

export function CharacterCircle({ character, size = "md" }: { character: CharacterSummary; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-24 w-24" : "h-16 w-16";
  return (
    <Link
      to="/character/$slug"
      params={{ slug: character.slug }}
      className="group flex w-20 shrink-0 flex-col items-center gap-2"
    >
      <span className={`avatar-ring rounded-full p-[3px] transition-transform group-hover:scale-105 ${dim}`}>
        {character.avatar_url ? (
          <img
            src={character.avatar_url}
            alt={character.name}
            loading="lazy"
            className="h-full w-full rounded-full border-2 border-background object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-background bg-secondary font-display text-lg">
            {character.name.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {character.name}
      </span>
    </Link>
  );
}
