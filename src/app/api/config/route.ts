import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/config";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const updates = await request.json();
    await updateConfig(updates);
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
