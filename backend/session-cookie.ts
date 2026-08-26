// Name of the httpOnly session cookie, isolated in its own file (zero other
// imports) so it can be safely imported from `middleware.ts`, which runs in
// the Edge runtime and cannot bundle `backend/auth.ts` (pulls in bcryptjs and
// the Prisma client, both Node-only). `backend/auth.ts` re-exports this same
// constant so existing imports of `SESSION_COOKIE_NAME` from there keep
// working unchanged.
export const SESSION_COOKIE_NAME = "session";
