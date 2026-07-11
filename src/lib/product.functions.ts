import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVendorProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Must be approved vendor to fetch their products
    const { data: appData } = await supabaseAdmin
      .from("vendor_applications")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (appData?.status !== "approved") {
      throw new Error("Only approved vendors can access products.");
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("vendor_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });

export const getVendorProductsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { vendorId: string }) =>
    z.object({ vendorId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("vendor_id", data.vendorId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return products;
  });

const ProductInputSchema = z.object({
  id: z.string().uuid().optional(),
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
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof ProductInputSchema>) => ProductInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify vendor
    const { data: appData } = await supabaseAdmin
      .from("vendor_applications")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (appData?.status !== "approved") throw new Error("Not authorized");

    const imageUrls: string[] = [];

    // Upload base64 images
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      if (img.startsWith("data:image")) {
        const mime = img.substring(img.indexOf(":") + 1, img.indexOf(";"));
        const ext = mime.split("/")[1] || "png";
        const base64Data = img.split(",")[1];
        const bytes = Buffer.from(base64Data, "base64");
        const path = `${context.userId}/${Date.now()}-${i}.${ext}`;

        const { error: upErr } = await supabaseAdmin.storage
          .from("vendor-products")
          .upload(path, bytes, { contentType: mime, upsert: true });

        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);

        const { data: urlData } = supabaseAdmin.storage.from("vendor-products").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      } else {
        // existing url
        imageUrls.push(img);
      }
    }

    const payload = {
      vendor_id: context.userId,
      name: data.name,
      category: data.category,
      description: data.description,
      selling_price: data.selling_price,
      mrp: data.mrp,
      stock: data.stock,
      unit: data.unit,
      is_active: data.is_active,
      images: imageUrls,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      // Update
      const { error } = await supabaseAdmin
        .from("products")
        .update(payload)
        .eq("id", data.id)
        .eq("vendor_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      // Create
      const { error } = await supabaseAdmin.from("products").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", data.id)
      .eq("vendor_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
