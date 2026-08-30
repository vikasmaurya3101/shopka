import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/settings";

export const revalidate = 60;

export async function GET() {
  const data = await getPublicSettings();
  return NextResponse.json({ success: true, data });
}
