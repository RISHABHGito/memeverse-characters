#!/usr/bin/env python3
"""Generate meme seed SQL for existing characters in the MemeVerse DB.

Reads characters from the DB via psql, finds 3 YouTube videos per character,
fetches oEmbed metadata, embeds text via the Lovable AI gateway, and writes
batch SQL files under .seed/out/.
"""
import csv
import io
import json
import os
import subprocess
import time
import urllib.request

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
BATCH_SIZE = 5

SEARCHES = {
    "babu-bhaiya": "babu bhaiya meme hera pheri",
    "rajpal-yadav": "rajpal yadav comedy scene meme",
    "dwight-schrute": "dwight schrute best moments",
    "michael-scott": "michael scott best moments the office",
    "chandler-bing": "chandler bing funny moments",
    "sheldon-cooper": "sheldon cooper funny moments bazinga",
    "peter-griffin": "peter griffin funny moments",
    "homer-simpson": "homer simpson funny moments",
    "eric-cartman": "eric cartman funny moments",
    "borat": "borat funny moments",
    "gordon-ramsay": "gordon ramsay insults funny",
    "johnny-sins": "johnny sins meme",
}


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def get_characters():
    sql = "COPY (SELECT slug, name, origin, COALESCE(array_to_string(tags,'|'),'') FROM public.characters ORDER BY name) TO STDOUT WITH CSV"
    r = run(["psql", "-c", sql])
    if r.returncode != 0:
        raise RuntimeError("psql failed: " + r.stderr)
    chars = []
    for row in csv.reader(io.StringIO(r.stdout)):
        chars.append({
            "slug": row[0],
            "name": row[1],
            "origin": row[2] if row[2] else "",
            "tags": [t for t in row[3].split("|") if t] if row[3] else [],
        })
    return chars


def yt_search(query, n=3):
    r = run(["yt-dlp", f"ytsearch{n}:{query}", "--flat-playlist", "--print", "%(id)s\t%(title)s"])
    if r.returncode != 0:
        print("yt-dlp failed for", query, r.stderr[:200])
        return []
    vids = []
    for line in r.stdout.strip().splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2:
            vids.append({"id": parts[0], "title": parts[1]})
    return vids


def oembed(video_id):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            d = json.loads(resp.read().decode())
        return {"author": d.get("author_name", ""), "thumbnail": d.get("thumbnail_url", ""), "title": d.get("title", "")}
    except Exception as e:
        print("oembed failed for", video_id, e)
        return None


def get_embeddings(texts):
    key = os.environ["LOVABLE_API_KEY"]
    out = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i + 100]
        body = json.dumps({"model": "google/gemini-embedding-2", "input": batch}).encode()
        req = urllib.request.Request(
            "https://ai.gateway.lovable.dev/v1/embeddings",
            data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        for attempt in range(6):
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    d = json.loads(resp.read().decode())
                items = sorted(d["data"], key=lambda x: x["index"])
                out.extend([it["embedding"] for it in items])
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 5:
                    wait = 2 ** attempt * 5
                    print(f"429 on embedding batch, retrying in {wait}s")
                    time.sleep(wait)
                else:
                    raise
    assert len(out) == len(texts)
    return out


def q(s):
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def pg_array(vec):
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    chars = get_characters()
    print(f"Found {len(chars)} characters")

    entries = []
    seen_ids = set()
    for ch in chars:
        query = SEARCHES.get(ch["slug"], ch["name"] + " meme")
        vids = yt_search(query, 3)
        print(ch["slug"], "->", len(vids), "videos")
        for v in vids:
            if v["id"] in seen_ids:
                print("  skipping duplicate", v["id"])
                continue
            seen_ids.add(v["id"])
            meta = oembed(v["id"])
            if meta is None:
                continue
            entries.append({"ch": ch, "v": v, "meta": meta})
        time.sleep(0.5)

    print(f"Embedding {len(entries)} memes...")
    texts = [" ".join([e["meta"]["title"], e["ch"]["name"], e["ch"]["origin"], " ".join(e["ch"]["tags"])]) for e in entries]
    embeddings = get_embeddings(texts)

    files = []
    for i in range(0, len(entries), BATCH_SIZE):
        batch = entries[i:i + BATCH_SIZE]
        embs = embeddings[i:i + BATCH_SIZE]
        rows = []
        for e, emb in zip(batch, embs):
            ch, v, meta = e["ch"], e["v"], e["meta"]
            source_url = f"https://www.youtube.com/watch?v={v['id']}"
            rows.append(
                f"({q(source_url)}, 'youtube'::public.meme_platform, {q(v['id'])}, {q(meta['title'])}, "
                f"{q(meta['thumbnail'])}, {q(meta['author'])}, ARRAY[]::text[], 'approved'::public.moderation_status, "
                f"(SELECT id FROM public.characters WHERE slug = {q(ch['slug'])}), {q(pg_array(emb))}::vector(3072))"
            )
        sql = (
            "-- MemeVerse meme seed batch\nBEGIN;\n"
            "INSERT INTO public.memes (source_url, platform, external_id, title, thumbnail_url, author_name, tags, status, character_id, embedding) VALUES\n"
            + ",\n".join(rows)
            + "\nON CONFLICT (platform, external_id) DO NOTHING;\nCOMMIT;\n"
        )
        idx = i // BATCH_SIZE + 1
        path = os.path.join(OUT_DIR, f"memes_{idx:02d}.sql")
        with open(path, "w") as f:
            f.write(sql)
        files.append(path)
    with open(os.path.join(OUT_DIR, "memes.json"), "w") as f:
        json.dump([{ "slug": e["ch"]["slug"], "id": e["v"]["id"], "title": e["meta"]["title"] } for e in entries], f, indent=2)
    print(f"Wrote {len(files)} batch files for {len(entries)} memes")


if __name__ == "__main__":
    main()
