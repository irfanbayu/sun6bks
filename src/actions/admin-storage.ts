"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const BUCKET = "performers";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type UploadResult = {
  success: boolean;
  url: string;
  message: string;
};

/**
 * Upload a performer image to Supabase Storage.
 * Accepts a FormData with a "file" field.
 * Returns the public URL of the uploaded image.
 */
export const uploadPerformerImage = async (
  formData: FormData
): Promise<UploadResult> => {
  await requireAdmin();

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { success: false, url: "", message: "File tidak ditemukan." };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { success: false, url: "", message: "Ukuran file maksimal 5MB." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      url: "",
      message: "Format file harus JPEG, PNG, WebP, atau GIF.",
    };
  }

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("[uploadPerformerImage] Upload error:", error);
      return { success: false, url: "", message: error.message };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;

    return {
      success: true,
      url: publicUrl,
      message: "Foto berhasil diupload.",
    };
  } catch (err) {
    console.error("[uploadPerformerImage] Error:", err);
    return {
      success: false,
      url: "",
      message: err instanceof Error ? err.message : "Gagal upload foto.",
    };
  }
};
