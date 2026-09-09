import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

function resolveServiceKey(): string {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw);
      const key = parsed?.default || Object.values(parsed)[0];
      if (key) return key as string;
    } catch (_e) {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

const SERVICE_KEY = resolveServiceKey();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_ANY_BYTES = MAX_VIDEO_BYTES;

function bytesMatch(buf: Uint8Array, offset: number, sig: number[]): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

function detectMedia(buf: Uint8Array): {
  mime: string;
  kind: "image" | "video" | "pdf" | "unknown";
  ext: string;
} {
  if (bytesMatch(buf, 0, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", kind: "image", ext: "jpg" };
  }
  if (bytesMatch(buf, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", kind: "image", ext: "png" };
  }
  if (
    bytesMatch(buf, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    bytesMatch(buf, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return { mime: "image/gif", kind: "image", ext: "gif" };
  }
  if (
    bytesMatch(buf, 0, [0x52, 0x49, 0x46, 0x46]) &&
    bytesMatch(buf, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return { mime: "image/webp", kind: "image", ext: "webp" };
  }
  if (bytesMatch(buf, 0, [0x25, 0x50, 0x44, 0x46])) {
    return { mime: "application/pdf", kind: "pdf", ext: "pdf" };
  }
  if (bytesMatch(buf, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mime: "video/webm", kind: "video", ext: "webm" };
  }
  for (let i = 0; i < Math.min(32, buf.length - 8); i++) {
    if (
      buf[i] === 0x66 &&
      buf[i + 1] === 0x74 &&
      buf[i + 2] === 0x79 &&
      buf[i + 3] === 0x70
    ) {
      const brand = String.fromCharCode(
        buf[i + 4] || 0,
        buf[i + 5] || 0,
        buf[i + 6] || 0,
        buf[i + 7] || 0
      );
      if (brand.startsWith("qt")) {
        return { mime: "video/quicktime", kind: "video", ext: "mov" };
      }
      return { mime: "video/mp4", kind: "video", ext: "mp4" };
    }
  }
  return { mime: "application/octet-stream", kind: "unknown", ext: "bin" };
}

function maxForKind(kind: string): number {
  if (kind === "image") return MAX_IMAGE_BYTES;
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "pdf") return MAX_PDF_BYTES;
  return 0;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") || "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(
        {
          error:
            "Expected multipart/form-data with fields: file, purpose, and request_id (for evidence).",
        },
        400
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "evidence").toLowerCase();
    const requestId = String(form.get("request_id") || "").trim();
    const originalName = String(
      form.get("original_name") ||
        (file && typeof file === "object" && "name" in file
          ? (file as File).name
          : "upload")
    );

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: "file is required" }, 400);
    }

    if (
      purpose !== "evidence" &&
      purpose !== "impact" &&
      purpose !== "appreciation"
    ) {
      return jsonResponse(
        { error: "purpose must be evidence, impact, or appreciation" },
        400
      );
    }

    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(
        { error: "Authentication required. Sign in to upload media." },
        401
      );
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      token
    );
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const user = userData.user;
    const userEmail = (user.email || "").trim().toLowerCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    if (purpose === "evidence") {
      if (!requestId) {
        return jsonResponse(
          { error: "request_id is required for evidence uploads" },
          400
        );
      }

      const { data: reqRow, error: reqErr } = await supabase
        .from("requests")
        .select("id")
        .eq("id", requestId)
        .maybeSingle();

      if (reqErr || !reqRow) {
        return jsonResponse({ error: "Request not found" }, 404);
      }

      if (!isAdmin) {
        if (!userEmail) {
          return jsonResponse(
            { error: "Your account has no email; cannot verify ownership." },
            403
          );
        }

        const { data: privateRow, error: privateErr } = await supabase
          .from("request_private")
          .select("email")
          .eq("request_id", requestId)
          .maybeSingle();

        if (privateErr || !privateRow?.email) {
          return jsonResponse(
            { error: "Not authorized to upload evidence for this request." },
            403
          );
        }

        const ownerEmail = String(privateRow.email).trim().toLowerCase();
        if (ownerEmail !== userEmail) {
          return jsonResponse(
            { error: "Not authorized to upload evidence for this request." },
            403
          );
        }
      }
    }

    if (purpose === "impact") {
      if (!isAdmin) {
        return jsonResponse({ error: "Admin only" }, 403);
      }
    }

    if (purpose === "appreciation") {
      if (!requestId) {
        return jsonResponse(
          { error: "request_id is required for appreciation uploads" },
          400
        );
      }
      const { data: reqRow, error: reqErr } = await supabase
        .from("requests")
        .select("id, status")
        .eq("id", requestId)
        .maybeSingle();
      if (reqErr || !reqRow) {
        return jsonResponse({ error: "Request not found" }, 404);
      }
      if (reqRow.status !== "fulfilled") {
        return jsonResponse(
          {
            error:
              "Appreciation media is only allowed after a request is fulfilled.",
          },
          403
        );
      }
      if (!isAdmin) {
        if (!userEmail) {
          return jsonResponse(
            { error: "Your account has no email; cannot verify ownership." },
            403
          );
        }
        const { data: privateRow, error: privateErr } = await supabase
          .from("request_private")
          .select("email")
          .eq("request_id", requestId)
          .maybeSingle();
        if (privateErr || !privateRow?.email) {
          return jsonResponse(
            { error: "Not authorized to upload appreciation media." },
            403
          );
        }
        if (String(privateRow.email).trim().toLowerCase() !== userEmail) {
          return jsonResponse(
            { error: "Not authorized to upload appreciation media." },
            403
          );
        }
      }
    }

    if (file.size <= 0 || file.size > MAX_ANY_BYTES) {
      return jsonResponse(
        {
          error:
            "File too large or empty. Max " +
            Math.round(MAX_ANY_BYTES / (1024 * 1024)) +
            "MB.",
        },
        400
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    if (bytes.length < 12) {
      return jsonResponse({ error: "File too small or invalid" }, 400);
    }

    const detected = detectMedia(bytes);
    if (detected.kind === "unknown") {
      return jsonResponse(
        {
          error:
            "Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP, MP4, MOV, WEBM, PDF.",
        },
        400
      );
    }

    const limit = maxForKind(detected.kind);
    if (bytes.length > limit) {
      return jsonResponse(
        {
          error:
            detected.kind +
            " exceeds maximum size of " +
            Math.round(limit / (1024 * 1024)) +
            "MB.",
        },
        400
      );
    }

    if (
      (purpose === "impact" || purpose === "appreciation") &&
      detected.kind === "pdf"
    ) {
      return jsonResponse(
        { error: "PDF is not allowed for this media." },
        400
      );
    }

    const safeBase = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(-80);

    const uuid =
      (crypto.randomUUID && crypto.randomUUID()) ||
      String(Date.now()) + "-" + Math.random().toString(16).slice(2);

    let storagePath: string;
    let bucket: string;

    if (purpose === "evidence") {
      bucket = "seek-evidence";
      storagePath = requestId + "/" + uuid + "." + detected.ext;
    } else if (purpose === "appreciation") {
      bucket = "seek-impact";
      storagePath = "appreciation/" + requestId + "/" + uuid + "." + detected.ext;
    } else {
      bucket = "seek-impact";
      storagePath = uuid + "." + detected.ext;
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, bytes, {
        contentType: detected.mime,
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse(
        {
          error: "Storage upload failed",
          details: uploadError.message,
        },
        500
      );
    }

    if (purpose === "evidence") {
      const { error: metaErr } = await supabase.from("request_evidence").insert({
        request_id: requestId,
        storage_path: storagePath,
        file_name: safeBase || "evidence." + detected.ext,
        mime_type: detected.mime,
        file_size: bytes.length,
      });

      if (metaErr) {
        await supabase.storage.from(bucket).remove([storagePath]);
        return jsonResponse(
          {
            error: "Failed to save evidence metadata",
            details: metaErr.message,
          },
          500
        );
      }
    }

    if (purpose === "appreciation") {
      const { error: updErr } = await supabase.from("request_appreciation").insert({
        request_id: requestId,
        storage_path: storagePath,
        mime_type: detected.mime,
        media_kind: detected.kind === "video" ? "video" : "image",
        file_name: safeBase || "appreciation." + detected.ext,
      });
      if (updErr) {
        await supabase.storage.from(bucket).remove([storagePath]);
        return jsonResponse(
          {
            error: "Failed to save appreciation media",
            details: updErr.message,
          },
          500
        );
      }
    }

    return jsonResponse({
      success: true,
      purpose,
      storage_path: storagePath,
      bucket,
      mime_type: detected.mime,
      media_kind: detected.kind,
      file_size: bytes.length,
      file_name: safeBase || "upload." + detected.ext,
    });
  } catch (err) {
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
