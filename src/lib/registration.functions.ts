import { createServerFn } from "@tanstack/react-start";
import { submitApplicationSchema, type SubmitApplicationInput } from "./validation";
import {
  ALLOWED_DOCUMENT_MIME,
  MAX_DOCUMENT_BYTES,
  REQUIRED_DOCUMENTS,
  mobileToVendorEmail,
} from "./constants";
import {
  adminDb,
  adminStorage,
  adminAuth,
  getAdminInitializationError,
} from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

function generateApplicationCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `B24U-${new Date().getFullYear()}-${rand}`;
}

function decodeBase64(str: string): Buffer {
  const clean = str.includes(",") ? str.split(",")[1] : str;
  return Buffer.from(clean, "base64");
}

export const submitApplication = createServerFn({ method: "POST" })
  .validator((input: SubmitApplicationInput) => submitApplicationSchema.parse(input))
  .handler(async ({ data }) => {
    if (!adminAuth || !adminDb) {
      throw new Error(getAdminInitializationError());
    }
    // 1. Confirm OTP was verified (Ideally we check otpVerifications in Firestore)
    const otpSnap = await adminDb
      .collection(COLLECTIONS.OTP_VERIFICATIONS)
      .doc(data.mobile)
      .get();

    if (!otpSnap.exists || otpSnap.data()?.verified !== true) {
      throw new Error("Mobile number is not verified. Please verify OTP first.");
    }

    // 2. Reject duplicate mobile
    const usersSnap = await adminDb
      .collection(COLLECTIONS.USERS)
      .where("mobile", "==", data.mobile)
      .limit(1)
      .get();
    if (!usersSnap.empty) throw new Error("This mobile number is already registered.");

    // 3. Validate documents
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

    // 4. Create auth user
    const email = data.email ?? mobileToVendorEmail(data.mobile);
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password: data.password,
        emailVerified: true,
        phoneNumber: `+91${data.mobile}`,
        displayName: data.full_name,
      });
    } catch (e: any) {
      throw new Error(e.message ?? "Failed to create account");
    }
    const userId = userRecord.uid;

    try {
      const batch = adminDb.batch();

      // 5. Profile + role
      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
      batch.set(userRef, {
        id: userId,
        full_name: data.full_name,
        mobile: data.mobile,
        email: data.email ?? null,
        role: "vendor",
        created_at: new Date().toISOString(),
      });

      // 6. Insert application
      const applicationCode = generateApplicationCode();
      const appRef = adminDb.collection(COLLECTIONS.VENDOR_APPLICATIONS).doc();
      batch.set(appRef, {
        id: appRef.id,
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
        submitted_at: new Date().toISOString(),
      });

      // 7. Upload documents + insert document rows
      for (const [docType, doc] of Object.entries(data.documents)) {
        if (!doc) continue;

        const finalStoragePath = doc.base64;
        const finalSizeBytes = 0;

        // TEMPORARY: bypass real Firebase Storage if base64/blob.
        // When Firebase Storage is enabled, uncomment the upload logic:
        /*
        const bytes = decodeBase64(doc.base64);
        const ext = doc.file_name.split(".").pop() || "bin";
        const path = `vendor-documents/${userId}/${docType}-${Date.now()}.${ext}`;

        const file = adminStorage.bucket().file(path);
        await file.save(bytes, { contentType: doc.mime_type });
        finalStoragePath = path;
        finalSizeBytes = bytes.length;
        */

        const docRef = adminDb.collection(COLLECTIONS.APPLICATION_DOCUMENTS).doc();
        batch.set(docRef, {
          id: docRef.id,
          application_id: appRef.id,
          user_id: userId,
          doc_type: docType,
          storage_path: finalStoragePath,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          size_bytes: finalSizeBytes,
          is_temporary: true, // TEMPORARY FLAG
          uploaded_at: new Date().toISOString(),
        });
      }

      const historyRef = adminDb.collection("applicationStatusHistory").doc();
      batch.set(historyRef, {
        application_id: appRef.id,
        from_status: null,
        to_status: "pending",
        note: "Application submitted",
        performed_by: userId,
        created_at: new Date().toISOString(),
      });

      await batch.commit();

      return {
        success: true,
        application_code: applicationCode,
        email,
      };
    } catch (err) {
      await adminAuth.deleteUser(userId).catch(() => undefined);
      throw err;
    }
  });

export const checkMobileAvailable = createServerFn({ method: "POST" })
  .validator((input: { mobile: string }) => {
    if (!/^[6-9]\d{9}$/.test(input.mobile)) throw new Error("Invalid mobile");
    return input;
  })
  .handler(async ({ data }) => {
    if (!adminAuth || !adminDb) {
      throw new Error(getAdminInitializationError());
    }
    const snap = await adminDb
      .collection(COLLECTIONS.USERS)
      .where("mobile", "==", data.mobile)
      .limit(1)
      .get();
    return { available: snap.empty };
  });
