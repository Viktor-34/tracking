import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

export const runtime = "nodejs";

function ensureUploadsDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getExtensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  return "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Недопустимый тип файла" }, { status: 415 });
    }

    const uploadsDir = ensureUploadsDir();
    const ext = getExtensionFromMime(file.type) || path.extname(file.name) || "";
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const diskPath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    await fs.promises.writeFile(diskPath, Buffer.from(arrayBuffer));

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка при загрузке файла";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


