import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      payload = undefined;
    }

    const response = await fetch(`${BACKEND_URL}/api/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    if (contentType.includes("application/json")) {
      return NextResponse.json(text ? JSON.parse(text) : null, {
        status: response.status,
      });
    }

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "text/plain",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Upstream request failed", error: String(error) },
      { status: 500 },
    );
  }
}
