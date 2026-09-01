# MemeVerse — a meme platform organized by characters

A browsing app where every meme belongs to a CHARACTER (real or fictional) that has its own profile page, like an Instagram account no one operates. Memes are links to YouTube / Instagram / X, played in an embedded picture-in-picture style player — nothing is stored on our side except the link and its metadata.

## Core screens

1. **Feed (home)** — trending characters right now, each shown as a row/card with their hottest memes. Infinite scroll of meme cards.
2. **Search** — the centerpiece. Type a character name, nickname, or even a description ("angry office guy meme") and get the right character plus their memes.
3. **Character profile** — avatar, bio, tags, follower/fan count, meme grid, "follow" button.
4. **Meme player** — tap a meme, it opens in a floating PiP player (draggable, minimizable) so browsing continues while it plays.
5. **Submit a meme** — signed-in users paste a link, pick an existing character, and add tags. Tags apply to both the meme and the character: a submitter can suggest character tags/nicknames (e.g. "angry boss", "hera pheri", "babu bhaiya") right from the submit form, so admins don't have to enrich every character by hand. Goes to a moderation queue.
6. **Auth** — email/password + Google sign-in, with user profiles (username, avatar).
7. **Admin panel** — create/edit characters (only admins can), approve or reject submitted memes, merge duplicates.

## The search algorithm (the differentiator)

Hybrid ranking, run server-side, blending three signals:

1. **Lexical match** — Postgres full-text search over character name, aliases/nicknames, origin (movie/show), and meme title/tags, plus trigram fuzzy matching so typos ("hera pheri", "hera feri") still land.
2. **Semantic match** — every character and meme gets an AI embedding (Lovable AI, `google/gemini-embedding-2`) stored in pgvector. Describing a meme in plain words finds it even with zero keyword overlap.
3. **Popularity & recency boost** — views, likes, save count, and freshness nudge results, so the trending version of a character surfaces first.

Final score = weighted blend of the three, computed in one SQL function so results come back fast. Search results show a top "character match" block first, then individual memes.

Aliases are first-class: admins attach any number of nicknames/spellings to a character, and those feed both the lexical index and the embedding text.

## Data model

- `profiles` — app users (username, avatar), auto-created on signup
- `user_roles` — separate roles table (`admin`, `user`) with a security-definer `has_role()` check
- `characters` — name, slug, bio, avatar, origin, category, is_fictional, popularity score, search vector, embedding
- `character_aliases` — many nicknames per character
- `memes` — source_url, platform (youtube/instagram/x), external_id, title, thumbnail, character_id, submitted_by, status (pending/approved/rejected), tags, search vector, embedding
- `meme_interactions` — likes/saves/views used for ranking
- `character_follows` — user follows a character
- `trending_snapshots` — rolling popularity used by the feed

All tables get RLS: public read of approved content, users write only their own submissions, admins manage everything.

## Embeds

- **YouTube** — full inline iframe playback (works for Shorts too).
- **X/Twitter** — official embed widget.
- **Instagram** — Instagram blocks most inline playback; we show the oEmbed thumbnail + caption in the PiP frame with a tap-to-open-in-Instagram action. Honest fallback rather than a broken player.

Link submission auto-detects the platform, pulls title/thumbnail/author via oEmbed, and rejects duplicates by external ID.

## Design direction

Dark, high-contrast, "meme culture" energy — bold condensed display type, saturated accent, character avatars in circular rings like story bubbles, dense card grid. Not a generic purple SaaS look.

## Build order

1. Enable Lovable Cloud (database, auth, storage, server functions)
2. Schema + RLS + roles + seed a starter set of characters with real memes
3. Auth (email + Google) and user profiles
4. Character profile pages + PiP player
5. Feed with trending characters
6. Hybrid search (full-text + trigram first, embeddings layered on top)
7. Meme submission + admin moderation panel

## Technical notes

- TanStack Start server functions for all search, submission, and moderation logic; no client-side ranking.
- pgvector with halfvec HNSW index for 3072-dim embeddings; embeddings generated in a server function on character/meme create and on approval.
- Search is a single SQL function (`search_all`) taking the query text + query embedding, returning blended-score rows — one round trip.
- Popularity scores refreshed by a scheduled job rather than computed per request.
- Admin-only mutations verified server-side via `has_role`, never from client state.
