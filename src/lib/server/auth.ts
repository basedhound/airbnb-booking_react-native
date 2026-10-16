import { verifyToken } from "@clerk/backend";

import { HttpError } from "./http";

// Server only. Every API route calls this before doing any work. The app sends
// its Clerk session token (`useAuth().getToken()`) as a bearer token.
export async function requireSession(request: Request): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "unauthorized");
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "unauthorized");
  }
}
