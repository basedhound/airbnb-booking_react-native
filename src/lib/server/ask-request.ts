import { z } from "zod";

import { MAX_QUESTION } from "@/lib/ask";

// Server only. The body of POST /api/ask: which stay, and the guest's question.
export const askRequestSchema = z.object({
  slug: z.string().max(96).regex(/^[a-z0-9-]+$/),
  question: z.string().trim().min(1).max(MAX_QUESTION),
});
