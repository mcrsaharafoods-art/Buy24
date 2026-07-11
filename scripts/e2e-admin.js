import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  let errors = 0;
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
    errors++;
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
      // Ignore 404s for missing images or favicons
      if (!msg.text().includes('404')) {
        errors++;
      }
    }
  });

  try {
    console.log("Navigating to Admin Login...");
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    
    console.log("Filling login form...");
    const inputs = await page.$$('input');
    await inputs[0].type('muneendra2you@gmail.com');
    await inputs[1].type('admin@1990');
    
    console.log("Clicking login...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting for navigation to dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const url = page.url();
    console.log("Current URL:", url);
    if (!url.includes('/admin/applications')) {
      throw new Error("Failed to redirect to Admin Dashboard. Current URL: " + url);
    }
    
    console.log("Checking dashboard content...");
    const content = await page.content();
    if (!content.includes('Vendor Applications')) {
      throw new Error("Dashboard did not render 'Vendor Applications'");
    }

    console.log("Admin Login and Redirect Successful!");

    // Navigate to Vendors
    console.log("Navigating to Vendors...");
    await page.goto('http://localhost:5173/admin/vendors', { waitUntil: 'networkidle0' });
    if (!(await page.content()).includes('Vendors')) throw new Error("Vendors page failed");

    // Navigate to Products
    console.log("Navigating to Products...");
    await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle0' });
    if (!(await page.content()).includes('Products')) throw new Error("Products page failed");
    
    // Navigate to Categories
    console.log("Navigating to Categories...");
    await page.goto('http://localhost:5173/admin/categories', { waitUntil: 'networkidle0' });
    if (!(await page.content()).includes('Categories')) throw new Error("Categories page failed");

    // Navigate to Settings
    console.log("Navigating to Settings...");
    await page.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle0' });
    if (!(await page.content()).includes('Settings')) throw new Error("Settings page failed");

    if (errors > 0) {
      throw new Error(`Encountered ${errors} console/page errors during E2E test.`);
    }

    console.log("E2E Test Completed Successfully!");
  } catch (e) {
    console.log('E2E TEST FAILED:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
