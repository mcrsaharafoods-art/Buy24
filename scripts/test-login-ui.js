import puppeteer from "puppeteer";

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on("pageerror", (err) => {
    console.log("PAGE ERROR:", err.toString());
    console.log("STACK:", err.stack);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("CONSOLE ERROR:", msg.text());
    }
  });

  try {
    await page.goto("http://localhost:5174/admin/login", { waitUntil: "networkidle0" });

    // Fill in the form
    const inputs = await page.$$("input");
    await inputs[0].type("muneendra2you@gmail.com");
    await inputs[1].type("admin@1990");

    // Click login
    console.log("Clicking login...");
    await page.click('button[type="submit"]');

    // Wait a bit to catch errors
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    console.log("SCRIPT ERROR:", e);
  } finally {
    await browser.close();
  }
}

run();
