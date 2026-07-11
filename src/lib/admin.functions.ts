import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import { adminDb, adminStorage, adminAuth } from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

async function assertAdmin(userId: string) {
  if (!adminAuth || !adminDb) {
    throw new Error("Firebase Admin SDK not initialized.");
  }
  const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new Error("Forbidden: Requires Admin role");
  }
}

export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  try {
    console.log("[SERVER] bootstrapAdmin started");
    
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK not initialized.");
    }

    const adminEmail = "muneendra2you@gmail.com";
    let user;
    try {
      console.log(`[SERVER] Attempting to fetch user by email: ${adminEmail}`);
      user = await adminAuth.getUserByEmail(adminEmail);
      console.log(`[SERVER] User found. ID: ${user.uid}`);
    } catch (fetchError: any) {
      console.log(`[SERVER] User not found, creating new admin account... (${fetchError.message})`);
      user = await adminAuth.createUser({
        email: adminEmail,
        password: "admin@1990",
        displayName: "Super Admin",
      });
      console.log(`[SERVER] User created successfully. ID: ${user.uid}`);
      
      console.log("[SERVER] Setting custom claims...");
      await adminAuth.setCustomUserClaims(user.uid, { role: "admin", isSuperAdmin: true });
      
      console.log("[SERVER] Writing to Firestore...");
      await adminDb.collection(COLLECTIONS.USERS).doc(user.uid).set({
        id: user.uid,
        email: adminEmail,
        role: "admin",
        status: "active",
        isSuperAdmin: true,
        full_name: "Super Admin",
        created_at: new Date().toISOString(),
      });
      console.log("[SERVER] Firestore document created successfully.");
    }
    console.log("[SERVER] Bootstrap process completed successfully.");
    return { success: true };
  } catch (e: any) {
    console.error("[SERVER] BOOTSTRAP ERROR THROWN ON SERVER");
    console.error(`[SERVER] error.message: ${e.message}`);
    console.error(`[SERVER] error.stack: ${e.stack}`);
    console.error(`[SERVER] function name: bootstrapAdmin`);
    throw new Error(`[bootstrapAdmin] Failed: ${e.message}`);
  }
});

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const snapshot = await adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).get();
    const apps = snapshot.docs.map((doc: any) => doc.data());

    // Fetch profiles for full_name and mobile
    const usersSnap = await adminDb.collection(COLLECTIONS.USERS).get();
    const usersMap = new Map(usersSnap.docs.map((doc: any) => [doc.id, doc.data()]));

    return apps.map((app: any) => {
      const profile = usersMap.get(app.user_id);
      return {
        ...app,
        full_name: profile?.full_name,
        mobile: profile?.mobile,
      };
    });
  });

export const getApplicationDetail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const appSnap = await adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).doc(data.id).get();
    if (!appSnap.exists) throw new Error("Application not found");
    const app = appSnap.data()!;

    const profileSnap = await adminDb.collection(COLLECTIONS.USERS).doc(app.user_id).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    const docsSnap = await adminDb
      .collection(COLLECTIONS.APPLICATION_DOCUMENTS)
      .where("application_id", "==", data.id)
      .get();
    const documents = docsSnap.docs.map((d: any) => d.data());

    const historySnap = await adminDb
      .collection("applicationStatusHistory")
      .where("application_id", "==", data.id)
      .get();
    const history = historySnap.docs.map((d: any) => d.data());

    return { application: app, profile, documents, history };
  });

export const getAdminDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const bucket = adminStorage.bucket();
    const file = bucket.file(data.path);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 10 * 1000, // 10 minutes
    });
    return { url };
  });

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const appRef = adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).doc(data.id);
    await appRef.update({
      status: "approved",
      approved_at: new Date().toISOString(),
    });

    // Add history
    await adminDb.collection("applicationStatusHistory").add({
      application_id: data.id,
      from_status: "pending", // Ideally fetch current status
      to_status: "approved",
      note: "Application approved by admin",
      performed_by: context.userId,
      created_at: new Date().toISOString(),
    });
    return { success: true };
  });

export const rejectApplication = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string; reason: string }) =>
    z
      .object({
        id: z.string(),
        reason: z.string().trim().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const appRef = adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).doc(data.id);
    await appRef.update({
      status: "rejected",
      rejection_reason: data.reason,
      rejected_at: new Date().toISOString(),
    });

    await adminDb.collection("applicationStatusHistory").add({
      application_id: data.id,
      to_status: "rejected",
      note: `Rejected: ${data.reason}`,
      performed_by: context.userId,
      created_at: new Date().toISOString(),
    });
    return { success: true };
  });

export const requestReupload = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string; doc_types: string[]; message: string }) =>
    z
      .object({
        id: z.string(),
        doc_types: z.array(z.string()).min(1),
        message: z.string().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const appRef = adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).doc(data.id);
    await appRef.update({
      status: "reupload_required",
      admin_message: data.message,
      requested_reupload_docs: data.doc_types,
    });
    return { success: true };
  });

export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const snap = await adminDb.collection(COLLECTIONS.SETTINGS).doc("global").get();
    if (snap.exists) return snap.data();
    return {
      terms_content: "",
      privacy_content: "",
      android_link: "",
      ios_link: "",
      support_email: "support@buy24us.com",
      favicon_data_url: null,
    };
  });

export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: any) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const updateData: any = { ...data };

    if (data.favicon) {
      if (data.favicon.base64.startsWith("data:") || data.favicon.base64.startsWith("blob:")) {
        // TEMPORARY: bypass real Firebase Storage. Store local preview reference.
        // When Firebase Storage is enabled, restore the code below:
        /*
        const match = data.favicon.base64.match(
          /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
        );
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = mimeType.split("/")[1] || "png";
          const fileName = `system/favicon.${ext}`;
          const file = bucket.file(fileName);
          await file.save(buffer, { contentType: mimeType });
          await file.makePublic();
          faviconUrl = file.publicUrl();
        }
        */
        updateData.favicon_data_url = data.favicon.base64;
      }
      delete updateData.favicon;
      updateData.is_temporary = true; // TEMPORARY FLAG
    } else if (data.favicon === null) {
      updateData.favicon_data_url = null;
      delete updateData.favicon;
    }

    await adminDb.collection(COLLECTIONS.SETTINGS).doc("global").set(updateData, { merge: true });
    return { success: true };
  });

export const uploadSettingsLogo = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: any) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return { success: true };
  });
