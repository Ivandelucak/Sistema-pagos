import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Faltan variables de entorno de Cloudinary.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

function uploadBufferToCloudinary(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "credifer-stock/productos",
          resource_type: "image",
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("No se pudo subir la imagen."));
            return;
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );

      stream.end(buffer);
    },
  );
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    configureCloudinary();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió una imagen válida." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen." },
        { status: 400 },
      );
    }

    const maxSizeMb = 8;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `La imagen no puede superar ${maxSizeMb}MB.` },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await uploadBufferToCloudinary(buffer);

    return NextResponse.json({
      ok: true,
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al subir imagen";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
