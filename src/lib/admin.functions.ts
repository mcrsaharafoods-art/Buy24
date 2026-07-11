/**
 * Super Admin server functions. All require auth + admin role.
 * The admin account is bootstrapped by `bootstrapAdmin` on first login.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ALLOWED_FAVICON_MIME, MAX_FAVICON_BYTES } from "./constants";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/**
 * Idempotently creates the super admin account and role.
 * Public — safe because it only ever creates the single hardcoded admin.
 * Called by the admin login page before signing in.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Find existing admin user by listing users (Cloud API — small user base).
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(listErr.message);
  let adminUser = list.users.find((u) => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin" },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Admin creation failed");
    adminUser = created.user;

    await supabaseAdmin.from("profiles").insert({
      id: adminUser.id,
      full_name: "Super Admin",
      mobile: "0000000000",
      email: ADMIN_EMAIL,
    });
  }

  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", adminUser.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!existingRole) {
    await supabaseAdmin.from("user_roles").insert({ user_id: adminUser.id, role: "admin" });
  }

  return { success: true };
});

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("vendor_applications")
      .select("id, application_code, shop_name, status, submitted_at, user_id")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Join profile (name + mobile) with a second query since we don't have FK view.
    const userIds = data.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, mobile")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const byId = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    return data.map((r) => ({
      ...r,
      full_name: byId.get(r.user_id)?.full_name ?? "—",
      mobile: byId.get(r.user_id)?.mobile ?? "—",
    }));
  });

export const getApplicationDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app, error } = await supabaseAdmin
      .from("vendor_applications")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Application not found");

    const [{ data: profile }, { data: docs }, { data: history }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", app.user_id).maybeSingle(),
      supabaseAdmin.from("application_documents").select("*").eq("application_id", app.id),
      supabaseAdmin
        .from("application_status_history")
        .select("*")
        .eq("application_id", app.id)
        .order("created_at", { ascending: false }),
    ]);

    return { application: app, profile, documents: docs ?? [], history: history ?? [] };
  });

export const getAdminDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("vendor-documents")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

import { sendApprovalEmail } from "./email.service";

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appData } = await supabaseAdmin
      .from("vendor_applications")
      .select("status, user_id")
      .eq("id", data.id)
      .maybeSingle();

    if (!appData) throw new Error("Application not found");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", appData.user_id)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("vendor_applications")
      .update({
        status: "approved",
        rejection_reason: null,
        admin_message: null,
        requested_reupload_docs: null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("application_status_history").insert({
      application_id: data.id,
      from_status: appData.status ?? null,
      to_status: "approved",
      note: "Approved by admin",
      performed_by: context.userId,
    });

    if (appData.status !== "approved" && profile?.email) {
      // Fallback for demo URL, ideally read from env vars for prod
      const loginUrl = "https://www.buy24us.com/login";
      await sendApprovalEmail(profile.email, profile.full_name, loginUrl).catch((err) =>
        console.error("Failed to send approval email", err),
      );
    }

    return { success: true };
  });

export const rejectApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; reason: string }) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().min(5, "Please enter a reason (min 5 characters)").max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("vendor_applications")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("vendor_applications")
      .update({
        status: "rejected",
        rejection_reason: data.reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("application_status_history").insert({
      application_id: data.id,
      from_status: prev?.status ?? null,
      to_status: "rejected",
      note: data.reason,
      performed_by: context.userId,
    });
    return { success: true };
  });

export const requestReupload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; doc_types: string[]; message: string }) =>
    z
      .object({
        id: z.string().uuid(),
        doc_types: z
          .array(z.enum(["aadhaar", "pan", "shop_photo", "shop_license", "cancelled_cheque"]))
          .min(1, "Select at least one document"),
        message: z.string().trim().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("vendor_applications")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("vendor_applications")
      .update({
        status: "reupload_required",
        requested_reupload_docs: data.doc_types,
        admin_message: data.message,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("application_status_history").insert({
      application_id: data.id,
      from_status: prev?.status ?? null,
      to_status: "reupload_required",
      note: `${data.message} [docs: ${data.doc_types.join(", ")}]`,
      performed_by: context.userId,
    });
    return { success: true };
  });

export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { support_email?: string; favicon?: { mime: string; base64: string } | null }) =>
      z
        .object({
          support_email: z.string().trim().email().max(255).optional(),
          favicon: z
            .object({
              mime: z.string(),
              base64: z.string(),
            })
            .nullable()
            .optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const update: {
      updated_by: string;
      support_email?: string;
      favicon_data_url?: string | null;
    } = { updated_by: context.userId };
    if (data.support_email) update.support_email = data.support_email;

    if (data.favicon === null) {
      update.favicon_data_url = null;
    } else if (data.favicon) {
      if (!(ALLOWED_FAVICON_MIME as readonly string[]).includes(data.favicon.mime)) {
        throw new Error("Unsupported favicon type. Use PNG, ICO, SVG or WEBP.");
      }
      const clean = data.favicon.base64.includes(",")
        ? data.favicon.base64.split(",")[1]
        : data.favicon.base64;
      const bytes = Buffer.from(clean, "base64");
      if (bytes.length > MAX_FAVICON_BYTES) throw new Error("Favicon exceeds 200 KB");
      update.favicon_data_url = `data:${data.favicon.mime};base64,${clean}`;
    }

    const { error } = await supabaseAdmin.from("system_settings").update(update).eq("id", 1);
    if (error) throw new Error(error.message);
    return { success: true };
  });
