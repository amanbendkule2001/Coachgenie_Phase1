const { chromium } = require('playwright');

async function auditLivePages() {
  console.log("================================================================================");
  console.log("  COACHGENIE LIVE CONSOLE & PAGE STATUS AUDIT");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  const routes = [
    { name: "Login Page", url: "https://app.thecoachgenie.in/login" },
    { name: "Unauthorized Fallback", url: "https://app.thecoachgenie.in/unauthorized" },
    { name: "Offline Fallback", url: "https://app.thecoachgenie.in/offline" },
    { name: "Custom 404 Route", url: "https://app.thecoachgenie.in/this-route-does-not-exist" }
  ];

  for (const route of routes) {
    console.log(`\n[+] Auditing Route: ${route.name} (${route.url})`);
    try {
      const resp = await page.goto(route.url, { waitUntil: 'networkidle', timeout: 20000 });
      console.log(`    Status Code: ${resp.status()}`);
      
      const title = await page.title();
      console.log(`    Page Title:  "${title}"`);

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
      });
      console.log(`    Broken Images: ${brokenImages.length}`);
      if (brokenImages.length > 0) {
        console.log(`      [-] Broken Image URLs:`, brokenImages);
      }

    } catch (e) {
      console.log(`    [!] Navigation error: ${e.message}`);
    }
  }

  console.log("\n[+] Captured Browser Console Logs (Total: " + consoleLogs.length + "):");
  for (const log of consoleLogs) {
    const icon = log.type === 'error' ? '❌' : (log.type === 'warning' ? '⚠️' : 'ℹ️');
    console.log(`    ${icon} [${log.type.toUpperCase()}] ${log.text}`);
  }

  console.log("\n[+] Unhandled Client Page Errors (Total: " + pageErrors.length + "):");
  for (const err of pageErrors) {
    console.log(`    ❌ ${err}`);
  }

  await browser.close();
  console.log("\n================================================================================");
}

auditLivePages().catch(err => {
  console.error(err);
  process.exit(1);
});
