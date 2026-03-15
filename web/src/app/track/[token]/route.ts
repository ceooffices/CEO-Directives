/**
 * Email Open Tracking Endpoint
 * Pattern tham khảo: Track_URL /docs/[id]/route.ts
 *
 * Mỗi email chỉ đạo sẽ chèn tracking pixel:
 *   <img src="https://ceo.tikme.vn/track/[token]" width="1" height="1">
 *
 * Token format: base64(directiveId:recipientEmail:timestamp)
 *
 * Khi email được mở:
 *   - Bot (Outlook/Gmail preview): ghi log is_bot=true
 *   - Real user: ghi log is_bot=false
 *   - Trả về 1x1 transparent PNG
 */

import { NextRequest, NextResponse } from "next/server";
import { logEmailOpen } from "@/lib/supabase";

// 1x1 transparent PNG (68 bytes)
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);

// Bot detection pattern — tham khảo Track_URL
const BOT_PATTERN =
  /bot|googleimageproxy|yahoo.*slurp|bingpreview|microsoft|outlook|thunderbird|apple-mail|wget|curl|fetch|python|java|http|spider|crawler/i;

function decodeToken(token: string): {
  directiveId: string | null;
  recipient: string;
  timestamp: string;
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 2) return null;
    return {
      directiveId: parts[0] || null,
      recipient: parts[1] || "unknown",
      timestamp: parts[2] || "",
    };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Decode token
  const data = decodeToken(token);
  if (!data) {
    return new NextResponse(PIXEL, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // Detect bot vs real user
  const userAgent = request.headers.get("user-agent") || "";
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const isBot = BOT_PATTERN.test(userAgent);

  // Log to Supabase (async, non-blocking — same pattern as Track_URL)
  logEmailOpen(data.directiveId, data.recipient, ip, userAgent, isBot);

  // Return 1x1 transparent PNG
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
