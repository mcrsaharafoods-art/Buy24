import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('request', req => {
    console.log('API Request:', req.method(), req.url());
  });

  page.on('response', async res => {
    if (res.url().includes('_serverFn') || res.url().includes('_server')) {
      console.log('API Response:', res.status(), res.url());
      try { 
        const text = await res.text();
        console.log('API Body:', text.substring(0, 500)); 
      } catch (e) {}
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
    
    console.log("Waiting for navigation or error...");
    
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
      console.log("Navigated successfully to", page.url());
    } catch (e) {
      console.log("Navigation timed out. Checking for on-screen errors/toasts...");
      // Check for toast messages
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log("Body text contains:", bodyText.substring(0, 500)); // Log first 500 chars to find the error
    }
    
  } catch (e) {
    console.log('E2E TEST FAILED:', e);
  } finally {
    await browser.close();
  }
}

run();
