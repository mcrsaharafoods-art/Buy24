/**
 * Vendor-facing server functions (auth required).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_DOCUMENT_MIME, MAX_DOCUMENT_BYTES } from "./constants";

export const getMyApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: app, error } = await supabase
      .from("vendor_applications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) return { application: null, profile: null, documents: [] };

    const [{ data: profile }, { data: docs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("application_documents").select("*").eq("application_id", app.id),
    ]);

    return { application: app, profile, documents: docs ?? [] };
  });

/** Returns a short-lived signed URL for a document the caller owns (RLS enforced). */
export const getMyDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    // Verify the caller owns this document by checking prefix (matches storage RLS).
    if (!data.path.startsWith(`${context.userId}/`)) {
      throw new Error("Forbidden");
    }
    const { data: signed, error } = await context.supabase.storage
      .from("vendor-documents")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

/** Re-upload a single document that admin flagged. */
export const reuploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      doc_type: "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque";
      file_name: string;
      mime_type: string;
      base64: string;
    }) =>
      z
        .object({
          doc_type: z.enum(["aadhaar", "pan", "shop_photo", "shop_license", "cancelled_cheque"]),
          file_name: z.string().min(1).max(255),
          mime_type: z.string().min(1).max(100),
          base64: z.string().min(1),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(data.mime_type)) {
      throw new Error("Unsupported file type");
    }
    const clean = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bytes = Buffer.from(clean, "base64");
    if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error("File too large");

    const { data: app, error: appErr } = await supabase
      .from("vendor_applications")
      .select("id, status, requested_reupload_docs")
      .eq("user_id", userId)
      .maybeSingle();
    if (appErr) throw new Error(appErr.message);
    if (!app) throw new Error("Application not found");
    if (app.status !== "reupload_required") {
      throw new Error("Re-upload is not currently requested");
    }
    if (!app.requested_reupload_docs?.includes(data.doc_type)) {
      throw new Error("This document was not flagged for re-upload");
    }

    const ext = data.file_name.split(".").pop() || "bin";
    const path = `${userId}/${data.doc_type}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("vendor-documents")
      .upload(path, bytes, { contentType: data.mime_type, upsert: true });
    if (upErr) throw new Error(upErr.message);

    // Upsert document row.
    const { data: existing } = await supabase
      .from("application_documents")
      .select("id")
      .eq("application_id", app.id)
      .eq("doc_type", data.doc_type)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("application_documents")
        .update({
          storage_path: path,
          file_name: data.file_name,
          mime_type: data.mime_type,
          size_bytes: bytes.length,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("application_documents").insert({
        application_id: app.id,
        user_id: userId,
        doc_type: data.doc_type,
        storage_path: path,
        file_name: data.file_name,
        mime_type: data.mime_type,
        size_bytes: bytes.length,
      });
    }

    // Remove this doc from pending list; if empty, flip status back to pending.
    const remaining = (app.requested_reupload_docs ?? []).filter(
      (d: string) => d !== data.doc_type,
    );
    const { error: updErr } = await supabase
      .from("vendor_applications")
      .update({
        requested_reupload_docs: remaining.length ? remaining : null,
        status: remaining.length ? "reupload_required" : "pending",
        admin_message: remaining.length ? undefined : null,
      })
      .eq("id", app.id);
    if (updErr) throw new Error(updErr.message);

    if (!remaining.length) {
      await supabase.from("application_status_history").insert({
        application_id: app.id,
        from_status: "reupload_required",
        to_status: "pending",
        note: "All requested documents re-uploaded",
        performed_by: userId,
      });
    }

    return { success: true, remaining };
  });
