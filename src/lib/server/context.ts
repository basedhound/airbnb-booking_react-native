import { HttpError } from "./http";

// Server only. Sanity Context endpoints are MCP servers, but one stateless
// JSON-RPC `tools/call` is all we need, so there's no MCP client. Two
// endpoints, one organization token:
// - `roam-record-search` (GROQ mode, project 0z83ssmn, SANITY_CONTEXT_MCP_URL)
//   is where Dataset Embeddings (`text::semanticSimilarity()`) are available.
//   `groq_query` takes no params, so queries must be built with `lit()`
//   (search-groq.ts).
// - `roam-record-guest-policies` (Knowledge Base mode, SANITY_CONTEXT_KB_URL)
//   serves Roam's guest-policy Knowledge Base to Ask (policy-kb.ts).

type RpcResponse = {
  result?: { content?: { type: string; text: string }[]; isError?: boolean };
  error?: { code: number; message: string };
};

// The endpoint may answer as JSON or as one server-sent event.
async function readRpc(res: Response): Promise<RpcResponse> {
  const body = await res.text();
  if (!res.headers.get("content-type")?.includes("event-stream")) return JSON.parse(body);
  const data = body.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5)).join("");
  return JSON.parse(data);
}

/** Calls one Context tool and returns its text result. */
export async function callContextTool(
  url: string | undefined,
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  const token = process.env.SANITY_ORGANIZATION_TOKEN;
  if (!url || !token) throw new HttpError(500, "context_not_configured");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new HttpError(502, "context_unreachable");
  }
  if (!res.ok) {
    console.warn("context http", name, res.status);
    throw new HttpError(502, "context_failed");
  }

  const rpc = await readRpc(res).catch(() => ({}) as RpcResponse);
  const text = rpc.result?.content?.[0]?.text;
  // Error text can quote the query, which holds the guest's sentence: log codes only.
  if (rpc.error || rpc.result?.isError || !text) {
    console.warn("context call failed", name, rpc.error?.code ?? (rpc.result?.isError ? "tool_error" : "empty"));
    throw new HttpError(502, "context_failed");
  }
  return text;
}

export async function contextQuery<T>(query: string, signal?: AbortSignal): Promise<T> {
  const text = await callContextTool(process.env.SANITY_CONTEXT_MCP_URL, "groq_query", { query }, signal);
  return (JSON.parse(text) as { result: T }).result;
}
