import { sanityQuery } from "@/lib/sanity/fetch";
import { ASK_STAY_QUERY } from "@/lib/sanity/queries";
import { askRequestSchema } from "@/lib/server/ask-request";
import { requireSession } from "@/lib/server/auth";
import { HttpError, errorResponse } from "@/lib/server/http";
import { answerQuestion, type AskStayDetails } from "@/lib/server/policy-answers";
import { policyKnowledge } from "@/lib/server/policy-kb";

// POST /api/ask: { slug, question } → { cards, topics }. Jev picks which
// checked Knowledge Base sections and which of the stay's own rules answer the
// question; the cards quote them word for word. Never logs the question.
export async function POST(request: Request) {
  try {
    await requireSession(request);

    const body = askRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new HttpError(400, "bad_request");

    const started = Date.now();
    const [stay, knowledge] = await Promise.all([
      sanityQuery<AskStayDetails | null>(ASK_STAY_QUERY, { slug: body.data.slug }, request.signal).catch((error: Error) => {
        if (error.name === "AbortError") throw error;
        throw new HttpError(502, "stay_unavailable");
      }),
      policyKnowledge(),
    ]);
    if (!stay) throw new HttpError(404, "stay_not_found");
    const loaded = Date.now();

    const answer = await answerQuestion(body.data.question, stay, knowledge, request.signal);
    console.info("ask", {
      candidates: answer.candidates,
      picked: answer.topics.length,
      loadMs: loaded - started,
      jevMs: Date.now() - loaded,
    });
    return Response.json({ cards: answer.cards, topics: answer.topics });
  } catch (error) {
    return errorResponse(error);
  }
}
