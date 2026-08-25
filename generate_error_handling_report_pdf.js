const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
  console.log("Generating Error Handling Security Audit Report PDF...");

  const htmlPath = path.resolve(__dirname, 'error_handling_security_report.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const outputPath = path.resolve(__dirname, 'CoachGenie_Error_Handling_Security_Report.pdf');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '8mm',
      bottom: '8mm',
      left: '8mm',
      right: '8mm',
    },
  });

  await browser.close();
  console.log(`PDF successfully generated at: ${outputPath}`);
}

generatePDF().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
