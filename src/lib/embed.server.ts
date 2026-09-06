// Server-only: embed text via the Lovable AI gateway.
// Returns a pgvector-compatible string literal like "[0.01,-0.02,...]".
export async function embedText(text: string): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "google/gemini-embedding-2", input: text.slice(0, 6000) }),
  });
  if (!res.ok) {
    console.error("embed failed", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  const vec = data.data?.[0]?.embedding;
  if (!vec) return null;
  return "[" + vec.map((v) => v.toFixed(8)).join(",") + "]";
}
