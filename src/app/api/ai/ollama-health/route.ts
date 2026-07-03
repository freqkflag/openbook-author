import { NextRequest, NextResponse } from "next/server";
import { checkOllamaHealth } from "@/lib/ollama";

export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.searchParams.get("baseUrl") ?? undefined;
  const health = await checkOllamaHealth(baseUrl);
  return NextResponse.json(health);
}
