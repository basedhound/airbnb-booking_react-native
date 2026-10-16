// Server only. An error an API route turns into a status and a short code.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.code }, { status: error.status });
  console.error("api error", error instanceof Error ? error.name : typeof error);
  return Response.json({ error: "server_error" }, { status: 500 });
}
