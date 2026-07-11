import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const snap = await adminDb.collection(COLLECTIONS.SETTINGS).doc("global").get();

  if (snap.exists) {
    const data = snap.data()!;
    return {
      support_email: data.support_email || "support@buy24us.com",
      favicon_data_url: data.favicon_data_url || null,
      android_link: data.android_link || "",
      ios_link: data.ios_link || "",
      terms_content: data.terms_content || "",
      privacy_content: data.privacy_content || "",
    };
  }

  return {
    support_email: "support@buy24us.com",
    favicon_data_url: null,
    android_link: "",
    ios_link: "",
    terms_content: "",
    privacy_content: "",
  };
});
