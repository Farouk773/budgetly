import { NextRequest, NextResponse } from "next/server";
import { invalidateSession, SESSION_COOKIE_NAME } from "@/backend/auth";

export async function POST(request: NextRequest) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await invalidateSession(rawToken);
  }

  const response = NextResponse.json({}, { status: 200 });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
