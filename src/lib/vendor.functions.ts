import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import { adminDb, adminStorage } from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

export const getMyApplication = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const appsSnap = await adminDb
      .collection(COLLECTIONS.VENDOR_APPLICATIONS)
      .where("user_id", "==", context.userId)
      .limit(1)
      .get();

    if (appsSnap.empty) return { application: null, profile: null, documents: [] };

    const application = appsSnap.docs[0].data();

    const profileSnap = await adminDb.collection(COLLECTIONS.USERS).doc(context.userId).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    const docsSnap = await adminDb
      .collection(COLLECTIONS.APPLICATION_DOCUMENTS)
      .where("application_id", "==", application.id)
      .get();
    const documents = docsSnap.docs.map((d: any) => d.data());

    return { application, profile, documents };
  });

export const getMyDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    // Basic authorization: user can only fetch their own documents, or admins.
    // In Firebase storage, we generate signed URLs.
    if (!data.path.includes(context.userId)) {
      const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(context.userId).get();
      if (userSnap.data()?.role !== "admin") {
        throw new Error("Forbidden");
      }
    }

    const file = adminStorage.bucket().file(data.path);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 10 * 1000,
    });
    return { url };
  });

export const reuploadDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
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
    const appsSnap = await adminDb
      .collection(COLLECTIONS.VENDOR_APPLICATIONS)
      .where("user_id", "==", context.userId)
      .limit(1)
      .get();

    if (appsSnap.empty) throw new Error("Application not found");
    const appRef = appsSnap.docs[0].ref;
    const app = appsSnap.docs[0].data();

    if (app.status !== "reupload_required") {
      throw new Error("Application is not in a re-upload state");
    }

    const reqDocs: string[] = app.requested_reupload_docs || [];
    if (!reqDocs.includes(data.doc_type)) {
      throw new Error(`Document ${data.doc_type} was not requested for re-upload`);
    }

    const finalStoragePath = data.base64;
    const finalSizeBytes = 0;

    // TEMPORARY: bypass real Firebase Storage if base64/blob.
    // When Firebase Storage is enabled, uncomment the upload logic:
    /*
    const cleanBase64 = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bytes = Buffer.from(cleanBase64, "base64");
    const ext = data.file_name.split(".").pop() || "bin";
    const path = `vendor-documents/${context.userId}/${data.doc_type}-${Date.now()}.${ext}`;

    const file = adminStorage.bucket().file(path);
    await file.save(bytes, { contentType: data.mime_type });
    finalStoragePath = path;
    finalSizeBytes = bytes.length;
    */

    // Mark previous document of this type as overwritten/deleted or simply insert new
    // We will just insert new (fetch and update existing document row)
    const docsSnap = await adminDb
      .collection(COLLECTIONS.APPLICATION_DOCUMENTS)
      .where("application_id", "==", app.id)
      .where("doc_type", "==", data.doc_type)
      .get();

    const batch = adminDb.batch();

    if (!docsSnap.empty) {
      batch.update(docsSnap.docs[0].ref, {
        file_name: data.file_name,
        mime_type: data.mime_type,
        storage_path: finalStoragePath,
        size_bytes: finalSizeBytes,
        is_temporary: true, // TEMPORARY FLAG
        uploaded_at: new Date().toISOString(),
      });
    } else {
      const docRef = adminDb.collection(COLLECTIONS.APPLICATION_DOCUMENTS).doc();
      batch.set(docRef, {
        id: docRef.id,
        application_id: app.id,
        user_id: context.userId,
        doc_type: data.doc_type,
        storage_path: finalStoragePath,
        file_name: data.file_name,
        mime_type: data.mime_type,
        size_bytes: finalSizeBytes,
        is_temporary: true, // TEMPORARY FLAG
        uploaded_at: new Date().toISOString(),
      });
    }

    const remaining = reqDocs.filter((d) => d !== data.doc_type);

    batch.update(appRef, {
      requested_reupload_docs: remaining,
      ...(remaining.length === 0 ? { status: "pending" } : {}),
    });

    if (remaining.length === 0) {
      const historyRef = adminDb.collection("applicationStatusHistory").doc();
      batch.set(historyRef, {
        application_id: app.id,
        to_status: "pending",
        note: "All requested documents re-uploaded. Application is back in pending review.",
        performed_by: context.userId,
        created_at: new Date().toISOString(),
      });
    }

    await batch.commit();

    return { success: true, remaining };
  });
