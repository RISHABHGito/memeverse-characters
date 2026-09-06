import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { embedText } from "@/lib/embed.server";

// ---------- shared types ----------
export interface CharacterSummary {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  origin: string | null;
  category: string | null;
  is_fictional: boolean;
  tags: string[];
  meme_count: number;
  follower_count: number;
  popularity: number;
}

export interface MemeSummary {
  id: string;
  character_id: string;
  source_url: string;
  platform: "youtube" | "instagram" | "x" | "other";
  external_id: string | null;
  title: string;
  thumbnail_url: string | null;
  author_name: string | null;
  tags: string[];
  view_count: number;
  like_count: number;
  save_count: number;
  created_at: string;
  character_name?: string;
  character_slug?: string;
  character_avatar_url?: string | null;
}

// ---------- helpers ----------
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function detectPlatform(url: string): { platform: "youtube" | "instagram" | "x" | "other"; externalId: string | null } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/);
  if (yt) return { platform: "youtube", externalId: yt[1] ?? null };
  if (/instagram\.com\/(reel|p|reels)\//.test(url)) return { platform: "instagram", externalId: null };
  if (/(twitter\.com|x\.com)\/.+\/status\//.test(url)) return { platform: "x", externalId: null };
  return { platform: "other", externalId: null };
}

async function fetchOEmbed(url: string, platform: string): Promise<{ title: string; thumbnail: string | null; author: string | null }> {
  try {
    let endpoint: string | null = null;
    if (platform === "youtube") endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    if (!endpoint) return { title: url, thumbnail: null, author: null };
    const res = await fetch(endpoint);
    if (!res.ok) return { title: url, thumbnail: null, author: null };
    const d = (await res.json()) as { title?: string; thumbnail_url?: string; author_name?: string };
    return { title: d.title ?? url, thumbnail: d.thumbnail_url ?? null, author: d.author_name ?? null };
  } catch {
    return { title: url, thumbnail: null, author: null };
  }
}

// ---------- public reads ----------
export const getFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data: characters } = await sb
    .from("characters")
    .select("id, slug, name, bio, avatar_url, origin, category, is_fictional, tags, meme_count, follower_count, popularity")
    .order("popularity", { ascending: false })
    .limit(12);
  const chars = (characters ?? []) as CharacterSummary[];
  const ids = chars.map((c) => c.id);
  const { data: memes } = ids.length
    ? await sb
        .from("memes")
        .select("id, character_id, source_url, platform, external_id, title, thumbnail_url, author_name, tags, view_count, like_count, save_count, created_at")
        .eq("status", "approved")
        .in("character_id", ids)
        .order("like_count", { ascending: false })
    : { data: [] };
  const byChar = new Map<string, MemeSummary[]>();
  for (const m of (memes ?? []) as MemeSummary[]) {
    const arr = byChar.get(m.character_id) ?? [];
    arr.push(m);
    byChar.set(m.character_id, arr);
  }
  const { data: fresh } = await sb
    .from("memes")
    .select("id, character_id, source_url, platform, external_id, title, thumbnail_url, author_name, tags, view_count, like_count, save_count, created_at, characters(name, slug, avatar_url)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);
  const freshMemes = ((fresh ?? []) as unknown as (MemeSummary & { characters: { name: string; slug: string; avatar_url: string | null } | null })[]).map((m) => ({
    ...m,
    character_name: m.characters?.name,
    character_slug: m.characters?.slug,
    character_avatar_url: m.characters?.avatar_url,
    characters: undefined,
  }));
  return {
    characters: chars.map((c) => ({ ...c, memes: byChar.get(c.id) ?? [] })),
    freshMemes,
  };
});

export const searchAll = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ q: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const q = data.q.trim();
    const embedding = q.length >= 3 ? await embedText(q) : null;
    const sb = publicClient();
    const [charsRes, memesRes] = await Promise.all([
      sb.rpc("search_characters", { _q: q, _embedding: embedding, _limit: 8 }),
      sb.rpc("search_memes", { _q: q, _embedding: embedding, _limit: 40 }),
    ]);
    return {
      characters: (charsRes.data ?? []) as unknown as (CharacterSummary & { score: number })[],
      memes: (memesRes.data ?? []) as unknown as (MemeSummary & { score: number; character_name: string; character_slug: string; character_avatar_url: string | null })[],
    };
  });

export const getCharacter = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: character } = await sb
      .from("characters")
      .select("id, slug, name, bio, avatar_url, origin, category, is_fictional, tags, meme_count, follower_count, popularity")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!character) return null;
    const [aliasesRes, tagsRes, memesRes] = await Promise.all([
      sb.from("character_aliases").select("alias").eq("character_id", character.id),
      sb.from("character_tag_suggestions").select("tag").eq("character_id", character.id).eq("status", "approved"),
      sb
        .from("memes")
        .select("id, character_id, source_url, platform, external_id, title, thumbnail_url, author_name, tags, view_count, like_count, save_count, created_at")
        .eq("character_id", character.id)
        .eq("status", "approved")
        .order("like_count", { ascending: false }),
    ]);
    return {
      character: character as CharacterSummary,
      aliases: (aliasesRes.data ?? []).map((a) => a.alias),
      approvedTags: (tagsRes.data ?? []).map((t) => t.tag),
      memes: (memesRes.data ?? []) as MemeSummary[],
    };
  });

export const recordView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ memeId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sb = await adminClient();
    await sb.rpc("increment_meme_view", { _meme_id: data.memeId });
    return { ok: true };
  });

export const searchCharacterOptions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ q: z.string().max(100) }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb.rpc("search_characters", { _q: data.q, _embedding: null, _limit: 8 });
    return ((rows ?? []) as unknown as CharacterSummary[]).map((c) => ({ id: c.id, slug: c.slug, name: c.name, avatar_url: c.avatar_url, origin: c.origin }));
  });

// ---------- authenticated ----------
export const getSessionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: profile } = await context.supabase.from("profiles").select("username, display_name, avatar_url").eq("id", context.userId).maybeSingle();
    return { userId: context.userId, isAdmin: !!isAdmin, profile };
  });

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memeIds: z.array(z.string()).default([]), characterIds: z.array(z.string()).default([]) }).parse(input))
  .handler(async ({ data, context }) => {
    const [interactions, follows] = await Promise.all([
      data.memeIds.length
        ? context.supabase.from("meme_interactions").select("meme_id, kind").in("meme_id", data.memeIds)
        : Promise.resolve({ data: [] }),
      data.characterIds.length
        ? context.supabase.from("character_follows").select("character_id").in("character_id", data.characterIds)
        : Promise.resolve({ data: [] }),
    ]);
    return {
      interactions: (interactions.data ?? []) as { meme_id: string; kind: string }[],
      follows: (follows.data ?? []).map((f) => f.character_id) as string[],
    };
  });

export const toggleInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memeId: z.string(), kind: z.enum(["like", "save"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const existing = await context.supabase
      .from("meme_interactions")
      .select("id")
      .eq("meme_id", data.memeId)
      .eq("user_id", context.userId)
      .eq("kind", data.kind)
      .maybeSingle();
    if (existing.data) {
      await context.supabase.from("meme_interactions").delete().eq("id", existing.data.id);
      return { active: false };
    }
    await context.supabase.from("meme_interactions").insert({ meme_id: data.memeId, user_id: context.userId, kind: data.kind });
    return { active: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ characterId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const existing = await context.supabase
      .from("character_follows")
      .select("id")
      .eq("character_id", data.characterId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.data) {
      await context.supabase.from("character_follows").delete().eq("id", existing.data.id);
      return { following: false };
    }
    await context.supabase.from("character_follows").insert({ character_id: data.characterId, user_id: context.userId });
    return { following: true };
  });

export const submitMeme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        url: z.string().url().max(1000),
        characterId: z.string().uuid(),
        tags: z.array(z.string().min(1).max(40)).max(10).default([]),
        characterTags: z.array(z.string().min(1).max(40)).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { platform, externalId } = detectPlatform(data.url);
    if (platform === "other") throw new Error("Only YouTube, Instagram, or X links are supported.");
    const meta = await fetchOEmbed(data.url, platform);
    const embedding = await embedText(`${meta.title} ${data.tags.join(" ")}`);
    const { error } = await context.supabase.from("memes").insert({
      source_url: data.url,
      platform,
      external_id: externalId,
      title: meta.title,
      thumbnail_url: meta.thumbnail,
      author_name: meta.author,
      tags: data.tags,
      character_id: data.characterId,
      submitted_by: context.userId,
      status: "pending",
      ...(embedding ? { embedding } : {}),
    });
    if (error) {
      if (error.message.includes("memes_platform_external_uniq") || error.message.includes("duplicate")) {
        throw new Error("This meme has already been submitted.");
      }
      throw new Error(error.message);
    }
    for (const tag of data.characterTags) {
      await context.supabase
        .from("character_tag_suggestions")
        .upsert({ character_id: data.characterId, tag: tag.toLowerCase(), suggested_by: context.userId }, { onConflict: "character_id,tag,suggested_by", ignoreDuplicates: true });
    }
    return { ok: true };
  });

export const getMySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("memes")
      .select("id, title, thumbnail_url, status, created_at, characters(name, slug)")
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

// ---------- admin ----------
async function requireAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden: admins only");
}

export const adminListPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const [memes, tags] = await Promise.all([
      context.supabase
        .from("memes")
        .select("id, source_url, platform, external_id, title, thumbnail_url, author_name, tags, created_at, characters(name, slug, avatar_url)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("character_tag_suggestions")
        .select("id, character_id, tag, votes, created_at, characters(name, slug)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    return { memes: memes.data ?? [], tags: tags.data ?? [] };
  });

export const adminModerateMeme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memeId: z.string(), decision: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await context.supabase.from("memes").update({ status: data.decision }).eq("id", data.memeId);
    return { ok: true };
  });

export const adminModerateTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tagId: z.string(), decision: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await context.supabase.from("character_tag_suggestions").update({ status: data.decision }).eq("id", data.tagId);
    return { ok: true };
  });

export const adminUpsertCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
        bio: z.string().max(2000).optional(),
        avatar_url: z.string().url().max(1000).optional().or(z.literal("")),
        origin: z.string().max(200).optional(),
        category: z.string().max(100).optional(),
        is_fictional: z.boolean().default(true),
        tags: z.array(z.string().max(40)).max(15).default([]),
        aliases: z.array(z.string().max(80)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const sb = await adminClient();
    const embedding = await embedText(`${data.name} ${data.bio ?? ""} ${data.origin ?? ""} ${data.tags.join(" ")} ${data.aliases.join(" ")}`);
    const payload = {
      name: data.name,
      slug: data.slug,
      bio: data.bio || null,
      avatar_url: data.avatar_url || null,
      origin: data.origin || null,
      category: data.category || null,
      is_fictional: data.is_fictional,
      tags: data.tags,
      ...(embedding ? { embedding } : {}),
    };
    let characterId = data.id;
    if (characterId) {
      const { error } = await sb.from("characters").update(payload).eq("id", characterId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await sb.from("characters").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      characterId = created.id;
    }
    if (data.aliases.length && characterId) {
      await sb.from("character_aliases").insert(data.aliases.map((alias) => ({ character_id: characterId, alias: alias.toLowerCase() })));
    }
    return { ok: true, id: characterId };
  });
