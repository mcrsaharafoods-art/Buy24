import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to Admin Login...");
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    
    console.log("Filling login form...");
    const inputs = await page.$$('input');
    await inputs[0].type('muneendra2you@gmail.com');
    await inputs[1].type('admin@1990');
    
    console.log("Clicking login...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting for SPA transition...");
    await page.waitForFunction(() => window.location.pathname.includes('/admin/applications'), { timeout: 15000 });
    
    console.log("Navigated to:", page.url());
    await page.screenshot({ path: 'admin-dashboard-test.png' });
    
    // Check applications page
    let bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("Vendor Applications")) {
      console.log("✓ Vendor Applications page loaded successfully.");
    } else {
      console.log("✗ Vendor Applications page failed to load properly. Body:", bodyText.substring(0, 500));
    }
    
    console.log("Navigating to settings...");
    await page.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle0' });
    
    // Check settings page
    bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("Platform Settings")) {
      console.log("✓ Settings page loaded successfully.");
    } else {
      console.log("✗ Settings page failed to load properly. Body:", bodyText.substring(0, 500));
    }
    
  } catch (e) {
    console.log('E2E TEST FAILED:', e);
  } finally {
    await browser.close();
  }
}

run();
