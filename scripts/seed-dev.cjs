const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const certPath = path.join(process.cwd(), "firebase-service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(certPath, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth(app);
const db = getFirestore(app);

const imagesDir =
  "C:\\Users\\hp\\.gemini\\antigravity\\brain\\c4b55416-a585-4436-809d-b6bb67e2d694";
const publicTestDir = path.join(process.cwd(), "public", "test-data");

if (!fs.existsSync(publicTestDir)) {
  fs.mkdirSync(publicTestDir, { recursive: true });
}

function getImageUrl(imageName) {
  const files = fs.readdirSync(imagesDir);
  const file = files.find((f) => f.startsWith(imageName + "_"));
  if (!file) return "";

  const sourcePath = path.join(imagesDir, file);
  const destName = `${imageName}.png`;
  const destPath = path.join(publicTestDir, destName);

  fs.copyFileSync(sourcePath, destPath);
  return `/test-data/${destName}`;
}

async function run() {
  console.log("Seeding test users...");
  const usersToCreate = [
    { email: "admin@test.com", role: "admin", status: "active", shop_name: null },
    {
      email: "vendor-approved@test.com",
      role: "vendor",
      status: "approved",
      shop_name: "Fresh Foods Supermarket",
    },
    {
      email: "vendor-pending@test.com",
      role: "vendor",
      status: "pending",
      shop_name: "Pending Store",
    },
    {
      email: "vendor-rejected@test.com",
      role: "vendor",
      status: "rejected",
      shop_name: "Rejected Store",
    },
    {
      email: "vendor-suspended@test.com",
      role: "vendor",
      status: "suspended",
      shop_name: "Suspended Store",
    },
  ];

  const uids = {};

  for (const u of usersToCreate) {
    try {
      await auth.getUserByEmail(u.email).then((r) => auth.deleteUser(r.uid));
    } catch (e) {}
    const rec = await auth.createUser({
      email: u.email,
      password: "Password@123",
      emailVerified: true,
    });
    uids[u.role === "admin" ? "admin" : u.status] = rec.uid;

    await db
      .collection("users")
      .doc(rec.uid)
      .set({
        email: u.email,
        role: u.role,
        status: u.status,
        name: `Test ${u.role} ${u.status}`,
        isTestData: true,
        created_at: FieldValue.serverTimestamp(),
      });
  }

  console.log("Copying Images to Public folder for static serving...");
  const bannerUrl = getImageUrl("shop_banner");
  const logoUrl = getImageUrl("vendor_logo");
  const panUrl = getImageUrl("pan_card");
  const gstUrl = getImageUrl("gst_certificate");
  const aadhaarUrl = getImageUrl("aadhaar_card");
  const fssaiUrl = getImageUrl("business_license");
  const shopPhotoUrl = getImageUrl("shop_photograph");

  const productTypes = [
    "apple",
    "banana",
    "mango",
    "tomato",
    "potato",
    "onion",
    "milk",
    "cheese",
    "butter",
    "bread",
  ];
  const prodUrls = {};
  for (const pt of productTypes) {
    prodUrls[pt] = getImageUrl(`product_${pt}`);
  }

  console.log("Seeding Categories...");
  const cats = ["Vegetables", "Fruits", "Dairy", "Bakery", "Snacks", "Beverages", "Groceries"];
  for (const c of cats) {
    await db.collection("categories").doc(`test-${c.toLowerCase()}`).set({
      name: c,
      isTestData: true,
      created_at: FieldValue.serverTimestamp(),
    });
  }

  console.log("Seeding Settings...");
  await db.collection("settings").doc("global").set({
    platform_name: "Buy24Us Development",
    logo_url: logoUrl,
    support_email: "test@buy24us.com",
    terms: "Test Terms",
    privacy_policy: "Test Privacy",
    delivery_charges: 50,
    commission_percentage: 5,
    isTestData: true,
    updated_at: FieldValue.serverTimestamp(),
  });

  console.log("Seeding Vendor Applications & Vendors...");
  for (const status of ["pending", "approved", "rejected", "suspended"]) {
    const uid = uids[status];
    const shopName = usersToCreate.find((x) => x.status === status).shop_name;
    const appId = `test-app-${status}`;

    await db
      .collection("vendorApplications")
      .doc(appId)
      .set({
        user_id: uid,
        full_name: `Test Vendor ${status}`,
        mobile: "9999999999",
        email: `vendor-${status}@test.com`,
        shop_name: shopName,
        seller_type: "individual",
        gst_number: "22AAAAA0000A1Z5",
        fssai_number: "12345678901234",
        state: "Test State",
        district: "Test District",
        city: "Test City",
        pincode: "123456",
        account_holder_name: "Test Holder",
        bank_name: "Test Bank",
        account_number: "0000000000",
        ifsc: "TEST0001234",
        delivery_radius_km: 10,
        opening_time: "09:00",
        closing_time: "21:00",
        home_delivery: true,
        pickup_available: true,
        status: status,
        isTestData: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

    await db
      .collection("applicationDocuments")
      .doc(`doc-${appId}-pan`)
      .set({ application_id: appId, doc_type: "pan", file_url: panUrl, isTestData: true });
    await db
      .collection("applicationDocuments")
      .doc(`doc-${appId}-gst`)
      .set({ application_id: appId, doc_type: "gst", file_url: gstUrl, isTestData: true });
    await db.collection("applicationDocuments").doc(`doc-${appId}-shop_photo`).set({
      application_id: appId,
      doc_type: "shop_photo",
      file_url: shopPhotoUrl,
      isTestData: true,
    });
    await db.collection("applicationDocuments").doc(`doc-${appId}-shop_license`).set({
      application_id: appId,
      doc_type: "shop_license",
      file_url: fssaiUrl,
      isTestData: true,
    });

    if (status === "approved" || status === "suspended") {
      await db.collection("vendors").doc(uid).set({
        user_id: uid,
        application_id: appId,
        shop_name: shopName,
        banner_url: bannerUrl,
        logo_url: logoUrl,
        rating: 4.5,
        total_orders: 100,
        status: status,
        isTestData: true,
        created_at: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log("Seeding Products...");
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const pt = productTypes[i % productTypes.length];
    const catMap = {
      apple: "Fruits",
      banana: "Fruits",
      mango: "Fruits",
      tomato: "Vegetables",
      potato: "Vegetables",
      onion: "Vegetables",
      milk: "Dairy",
      cheese: "Dairy",
      butter: "Dairy",
      bread: "Bakery",
    };

    await db.collection("products").add({
      vendor_id: uids["approved"],
      name: `Premium ${pt.charAt(0).toUpperCase() + pt.slice(1)} ${i + 1}`,
      category: catMap[pt],
      description: `High quality test product ${i + 1}`,
      selling_price: 100 + i,
      mrp: 120 + i,
      discount_percentage: 10,
      stock: 50,
      unit: "kg",
      is_active: true,
      images: [prodUrls[pt]],
      isTestData: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    count++;
  }

  console.log(`Successfully seeded ${count} products.`);
  console.log("Development environment ready.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
