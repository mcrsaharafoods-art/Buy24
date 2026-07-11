/**
 * Registration submission — creates auth user, uploads documents, inserts
 * vendor application in one atomic-ish server call using service role.
 *
 * The mobile OTP MUST already be verified (checked here as a safeguard).
 */
import { createServerFn } from "@tanstack/react-start";
import { submitApplicationSchema, type SubmitApplicationInput } from "./validation";
import {
  ALLOWED_DOCUMENT_MIME,
  MAX_DOCUMENT_BYTES,
  REQUIRED_DOCUMENTS,
  mobileToVendorEmail,
} from "./constants";

function generateApplicationCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `B24U-${new Date().getFullYear()}-${rand}`;
}

function decodeBase64(str: string): Buffer {
  // Strip data-URL prefix if present.
  const clean = str.includes(",") ? str.split(",")[1] : str;
  return Buffer.from(clean, "base64");
}

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitApplicationInput) => submitApplicationSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Confirm OTP was verified.
    const { data: otpRows, error: otpErr } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, verified, code")
      .eq("mobile", data.mobile)
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (otpErr) throw new Error(otpErr.message);
    if (!otpRows?.[0]) throw new Error("Mobile number is not verified. Please verify OTP first.");

    // 2. Reject duplicate mobile / email.
    const { data: dupMobile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", data.mobile)
      .maybeSingle();
    if (dupMobile) throw new Error("This mobile number is already registered.");

    // 3. Validate documents.
    for (const docType of REQUIRED_DOCUMENTS) {
      if (!data.documents[docType]) {
        throw new Error(`Missing required document: ${docType}`);
      }
    }
    for (const [docType, doc] of Object.entries(data.documents)) {
      if (!doc) continue;
      if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(doc.mime_type)) {
        throw new Error(`Unsupported file type for ${docType}`);
      }
      const bytes = decodeBase64(doc.base64);
      if (bytes.length > MAX_DOCUMENT_BYTES) {
        throw new Error(`${docType} exceeds ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB`);
      }
    }

    // 4. Create auth user.
    const email = data.email ?? mobileToVendorEmail(data.mobile);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      phone: `+91${data.mobile}`,
      phone_confirm: true,
      user_metadata: { full_name: data.full_name, mobile: data.mobile },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create account");
    }
    const userId = created.user.id;

    try {
      // 5. Profile + role.
      const { error: profErr } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        full_name: data.full_name,
        mobile: data.mobile,
        email: data.email ?? null,
      });
      if (profErr) throw new Error(profErr.message);

      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "vendor" });
      if (roleErr) throw new Error(roleErr.message);

      // 6. Insert application.
      const applicationCode = generateApplicationCode();
      const { data: app, error: appErr } = await supabaseAdmin
        .from("vendor_applications")
        .insert({
          user_id: userId,
          application_code: applicationCode,
          shop_name: data.shop_name,
          seller_type: data.seller_type,
          gst_number: data.gst_number ?? null,
          fssai_number: data.fssai_number ?? null,
          state: data.state,
          district: data.district,
          city: data.city,
          pincode: data.pincode,
          address_line: data.address_line ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          account_holder_name: data.account_holder_name,
          bank_name: data.bank_name,
          account_number: data.account_number,
          ifsc: data.ifsc,
          upi_id: data.upi_id ?? null,
          delivery_radius_km: data.delivery_radius_km,
          opening_time: data.opening_time,
          closing_time: data.closing_time,
          home_delivery: data.home_delivery,
          pickup_available: data.pickup_available,
          status: "pending",
          terms_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (appErr || !app) throw new Error(appErr?.message ?? "Failed to save application");

      // 7. Upload documents + insert document rows.
      for (const [docType, doc] of Object.entries(data.documents)) {
        if (!doc) continue;
        const bytes = decodeBase64(doc.base64);
        const ext = doc.file_name.split(".").pop() || "bin";
        const path = `${userId}/${docType}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("vendor-documents")
          .upload(path, bytes, {
            contentType: doc.mime_type,
            upsert: true,
          });
        if (upErr) throw new Error(`Upload failed for ${docType}: ${upErr.message}`);

        const { error: docErr } = await supabaseAdmin.from("application_documents").insert({
          application_id: app.id,
          user_id: userId,
          doc_type: docType as
            "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque",
          storage_path: path,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          size_bytes: bytes.length,
        });
        if (docErr) throw new Error(docErr.message);
      }

      await supabaseAdmin.from("application_status_history").insert({
        application_id: app.id,
        from_status: null,
        to_status: "pending",
        note: "Application submitted",
        performed_by: userId,
      });

      return {
        success: true,
        application_code: applicationCode,
        email,
      };
    } catch (err) {
      // Roll back auth user on failure.
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw err;
    }
  });

/** Cheap availability check used by the wizard on the mobile field. */
export const checkMobileAvailable = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string }) => {
    if (!/^[6-9]\d{9}$/.test(input.mobile)) throw new Error("Invalid mobile");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile", data.mobile)
      .maybeSingle();
    return { available: !row };
  });
