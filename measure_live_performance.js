const { chromium } = require('playwright');

async function measureLivePerformance() {
  console.log("================================================================================");
  console.log("  COACHGENIE LIVE PERFORMANCE & CORE WEB VITALS BENCHMARK");
  console.log("  Target URL: https://app.thecoachgenie.in/login");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkRequests = [];
  page.on('response', response => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] || 'unknown',
      fromCache: response.fromServiceWorker()
    });
  });

  const startTime = Date.now();
  const response = await page.goto('https://app.thecoachgenie.in/login', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  const totalLoadTimeMs = Date.now() - startTime;

  // Extract navigation & paint timings via browser Performance API
  const metrics = await page.evaluate(() => {
    const navTiming = performance.getEntriesByType('navigation')[0] || {};
    const paintEntries = performance.getEntriesByType('paint') || [];
    
    let fcp = 0;
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        fcp = entry.startTime;
      }
    }

    const resources = performance.getEntriesByType('resource').map(r => ({
      name: r.name.split('/').pop().split('?')[0] || r.name,
      initiatorType: r.initiatorType,
      durationMs: Math.round(r.duration),
      transferSize: r.transferSize || 0
    }));

    return {
      ttfb: Math.round(navTiming.responseStart - navTiming.requestStart),
      domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart),
      loadComplete: Math.round(navTiming.loadEventEnd - navTiming.fetchStart),
      fcp: Math.round(fcp),
      resourcesCount: resources.length,
      resources: resources.slice(0, 15) // Top 15 resources
    };
  });

  console.log("\n[+] Core Web Vitals & Load Benchmarks:");
  console.log(`    - Time to First Byte (TTFB):        ${metrics.ttfb} ms`);
  console.log(`    - First Contentful Paint (FCP):      ${metrics.fcp} ms`);
  console.log(`    - DOM Content Loaded:                ${metrics.domContentLoaded} ms`);
  console.log(`    - Total Window Load Event:           ${metrics.loadComplete} ms`);
  console.log(`    - Total Network Idle Load Time:      ${totalLoadTimeMs} ms`);

  console.log("\n[+] Network Assets Audited:");
  console.log(`    - Total Requests Handled:            ${networkRequests.length}`);
  console.log(`    - Top Script/Asset Timings:`);
  for (const res of metrics.resources) {
    console.log(`      • [${res.initiatorType.toUpperCase()}] ${res.name.padEnd(35)} -> ${res.durationMs}ms (${res.transferSize} bytes)`);
  }

  await browser.close();
  console.log("\n================================================================================");
  console.log("  BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("================================================================================");
}

measureLivePerformance().catch(err => {
  console.error("Performance measurement failed:", err);
  process.exit(1);
});
