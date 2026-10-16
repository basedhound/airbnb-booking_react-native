// Reads published content from Sanity's public API CDN. The dataset is public,
// so no token is sent and none ever ships in the app. Values always go in as
// GROQ params, never into the query string itself.

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
const apiVersion = "v2026-10-08";

export class SanityError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "SanityError";
  }
}

export async function sanityQuery<T>(
  query: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!projectId || !dataset) throw new SanityError("Sanity project isn't configured", 0);

  const search = new URLSearchParams({ query, perspective: "published" });
  for (const [name, value] of Object.entries(params)) search.set(`$${name}`, JSON.stringify(value));

  let res: Response;
  try {
    res = await fetch(`https://${projectId}.apicdn.sanity.io/${apiVersion}/data/query/${dataset}?${search}`, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new SanityError("Network error", 0);
  }
  if (!res.ok) throw new SanityError(`Sanity query failed (${res.status})`, res.status);
  const body = (await res.json()) as { result: T };
  return body.result;
}

// Sanity image CDN URL sized for a card. `url` comes from `asset->url`.
export const imageUrl = (url: string, width = 1200) => `${url}?w=${width}&auto=format&q=80`;
