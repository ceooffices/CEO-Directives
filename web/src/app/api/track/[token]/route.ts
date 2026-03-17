/**
 * Tracking Pixel API Route — /api/track/[token]
 * 
 * Nhận request từ email client khi đầu mối mở email.
 * Token format: base64url(directiveId:recipientEmail:timestamp)
 * 
 * Triết lý: Ghi nhận tín hiệu hành vi — không phán xét, chỉ nhận diện
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// 1x1 transparent GIF — 43 bytes
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Bot detection — những user-agent không phải người thật mở email
const BOT_PATTERNS = [
  /googleimageproxy/i,
  /google-smtp-in/i,
  /GoogleImageProxy/i,
  /outlookoffice365/i,
  /microsoft office/i,
  /Office\/16/i,
  /OWA-iPhone/i,
  /Windows-RSS-Platform/i,
  /ScanSafe/i,
  /Barracuda/i,
  /Symantec/i,
  /MessageLabs/i,
  /Proofpoint/i,
  /Mimecast/i,
  /ZScaler/i,
  /MailMarshal/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,
  /Amazonbot/i,
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /HeadlessChrome/i,
  /PhantomJS/i,
];

// Apple Mail Proxy — đặc biệt: fetch trước khi user mở
// iOS 15+ Mail Privacy Protection tải tất cả ảnh qua Apple proxy
const APPLE_PROXY_PATTERNS = [
  /AppleMail/i,
  /Apple-Mail/i,
  /apple-data-detectors/i,
];

function isBot(userAgent: string): { isBot: boolean; botType: string | null } {
  if (!userAgent) return { isBot: false, botType: null };

  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: "security_scanner" };
    }
  }

  for (const pattern of APPLE_PROXY_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: "apple_mail_privacy" };
    }
  }

  return { isBot: false, botType: null };
}

function decodeToken(token: string): {
  directiveId: string;
  email: string;
  timestamp: string;
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return null;

    // Format: directiveId:email:timestamp
    // Email may contain ":" so we need to handle carefully
    const directiveId = parts[0];
    const timestamp = parts[parts.length - 1];
    const email = parts.slice(1, -1).join(":");

    if (!directiveId || !email) return null;

    return { directiveId, email, timestamp };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Always return the pixel immediately — never block email rendering
  const gifResponse = () =>
    new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": "43",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

  // Decode token
  const decoded = decodeToken(token);
  if (!decoded) {
    console.warn("[TRACK] Invalid token:", token.substring(0, 20) + "...");
    return gifResponse();
  }

  // Extract request info
  const userAgent = request.headers.get("user-agent") || "";
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  // Bot detection
  const botCheck = isBot(userAgent);

  // Fire-and-forget — insert vào DB, không chờ
  try {
    const sb = getServiceClient();

    await sb.from("engagement_events").insert({
      directive_id: decoded.directiveId,
      event_type: "email_opened",
      recipient_email: decoded.email,
      metadata: {
        ip,
        user_agent: userAgent.substring(0, 500),
        is_bot: botCheck.isBot,
        bot_type: botCheck.botType,
        pixel_timestamp: decoded.timestamp,
        opened_at: new Date().toISOString(),
      },
    });

    if (!botCheck.isBot) {
      console.log(
        `[TRACK] ✅ Email opened: ${decoded.email} → directive ${decoded.directiveId.substring(0, 8)}...`
      );
    }
  } catch (err) {
    // Never fail — tracking is best-effort
    console.error("[TRACK] DB insert error:", err);
  }

  return gifResponse();
}
