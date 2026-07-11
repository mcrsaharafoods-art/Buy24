import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import { adminDb, adminStorage } from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

export const getVendorProducts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const snap = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .where("vendor_id", "==", context.userId)
      .get();
    return snap.docs.map((d: any) => d.data());
  });

export const getVendorProductsAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { vendorId: string }) => z.object({ vendorId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    // Assert Admin (ideally shared from admin.functions, but doing a quick check)
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(context.userId).get();
    if (userSnap.data()?.role !== "admin") throw new Error("Forbidden");

    const snap = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .where("vendor_id", "==", data.vendorId)
      .get();
    return snap.docs.map((d: any) => d.data());
  });

const ProductInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  selling_price: z.number().min(0),
  mrp: z.number().min(0),
  stock: z.number().int().min(0),
  unit: z.string().min(1),
  is_active: z.boolean(),
  images: z.array(z.string()), // can be base64 data URIs for new ones, or existing URLs
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: z.infer<typeof ProductInputSchema>) => ProductInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const bucket = adminStorage.bucket();
    const uploadedImages = [];

    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      if (img.startsWith("data:") || img.startsWith("blob:")) {
        // TEMPORARY: bypass real Firebase Storage. Store local preview reference.
        // When Firebase Storage is enabled, restore the code below:
        /*
        const match = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = mimeType.split("/")[1] || "png";
          const fileName = `products/${context.userId}/${Date.now()}-${i}.${ext}`;
          const file = bucket.file(fileName);
          await file.save(buffer, { contentType: mimeType });
          await file.makePublic(); // Assuming public products
          uploadedImages.push(file.publicUrl());
        }
        */
        uploadedImages.push(img);
      } else {
        uploadedImages.push(img);
      }
    }

    const productData = {
      name: data.name,
      category: data.category,
      description: data.description,
      selling_price: data.selling_price,
      mrp: data.mrp,
      stock: data.stock,
      unit: data.unit,
      is_active: data.is_active,
      images: uploadedImages,
      vendor_id: context.userId,
      is_temporary: true, // TEMPORARY FLAG
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      // Verify ownership
      const pSnap = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(data.id).get();
      if (!pSnap.exists || pSnap.data()?.vendor_id !== context.userId) {
        throw new Error("Forbidden");
      }
      await adminDb.collection(COLLECTIONS.PRODUCTS).doc(data.id).update(productData);
    } else {
      const newRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc();
      await newRef.set({
        ...productData,
        id: newRef.id,
        created_at: new Date().toISOString(),
      });
    }

    return { success: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const pSnap = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(data.id).get();
    if (!pSnap.exists) return { success: true };
    if (pSnap.data()?.vendor_id !== context.userId) {
      throw new Error("Forbidden");
    }

    // Optional: Delete images from storage here

    await adminDb.collection(COLLECTIONS.PRODUCTS).doc(data.id).delete();
    return { success: true };
  });
