const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
  console.log("Generating Authentication Security Audit Report PDF...");

  const htmlPath = path.resolve(__dirname, 'auth_security_report.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const outputPath = path.resolve(__dirname, 'CoachGenie_Authentication_Security_Audit_Report.pdf');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await browser.close();
  console.log(`PDF successfully generated at: ${outputPath}`);
}

generatePDF().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
