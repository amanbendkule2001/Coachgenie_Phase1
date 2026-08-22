import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoicePDFData } from "@/components/finance/InvoicePDFModal";

export function generateInvoicePDF(
  data: InvoicePDFData,
  options?: {
    instituteName?: string;
    instituteCode?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
  }
) {
  const instituteName = options?.instituteName || "CoachGenie Academy";
  const instituteCode = options?.instituteCode || "CG-ACAD-2026";
  const contactPhone = options?.contactPhone || "+91 98765 43210";
  const contactEmail = options?.contactEmail || "billing@coachgenie.edu";
  const instituteAddress = options?.address || "Main Academic Campus, Educational Hub, Pune, Maharashtra - 411001";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const totalFee = Number(data.totalFee || 0);
  const feePaid = Number(data.feePaid || 0);
  const remaining = Math.max(0, totalFee - feePaid);
  const pctCleared = totalFee > 0 ? Math.min(100, Math.round((feePaid / totalFee) * 100)) : 0;

  // ── True Financial Status ──
  const isFullyPaid = remaining === 0 && totalFee > 0;
  const isPartiallyPaid = feePaid > 0 && remaining > 0;

  const statusLabel = isFullyPaid
    ? "FULLY PAID"
    : isPartiallyPaid
    ? "PARTIALLY PAID"
    : "PENDING / DUE";

  // ── Curated Color Palette ──
  const primaryColor = [88, 28, 135]; // Deep Indigo-Violet 800
  const bannerBg = [109, 40, 217]; // Violet 700
  const secondaryColor = [30, 41, 59]; // Slate 800
  const cardBg = [248, 250, 252]; // Slate 50
  const emeraldColor = [16, 185, 129]; // Emerald 500
  const amberColor = [217, 119, 6]; // Amber 600
  const redColor = [225, 29, 72]; // Rose 600

  const statusColor = isFullyPaid ? emeraldColor : isPartiallyPaid ? amberColor : redColor;

  // ── Top Header Banner ──
  doc.setFillColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Accent Bottom Line on Header
  doc.setFillColor(147, 51, 234);
  doc.rect(0, 29.2, pageWidth, 0.8, "F");

  // Institute Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(instituteName, 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(237, 233, 254); // Violet 100
  doc.text(`${instituteAddress}`, 14, 17);
  doc.text(`Code: ${instituteCode}  ·  Phone: ${contactPhone}  ·  Email: ${contactEmail}`, 14, 22);

  // Top-Right Invoice Badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 68, 6, 54, 17, 2, 2, "F");

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TAX & TUITION INVOICE", pageWidth - 41, 11.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(data.invoiceNo?.startsWith("#") ? data.invoiceNo : `#${data.invoiceNo || "INV-RECEIPT"}`, pageWidth - 41, 16.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${data.date || new Date().toISOString().slice(0, 10)}`, pageWidth - 41, 20.5, { align: "center" });

  let curY = 36;

  // ── Executive KPI Metric Row (4 Columns) ──
  const colW = (pageWidth - 28) / 4;

  const stats = [
    { label: "TOTAL COURSE FEE", val: `Rs. ${totalFee.toLocaleString("en-IN")}`, sub: "Official Prescribed Fee", color: secondaryColor },
    { label: "TOTAL AMOUNT PAID", val: `Rs. ${feePaid.toLocaleString("en-IN")}`, sub: `${pctCleared}% Cleared`, color: emeraldColor },
    { label: "BALANCE OUTSTANDING", val: `Rs. ${remaining.toLocaleString("en-IN")}`, sub: remaining > 0 ? "Pending Collection" : "Zero Dues", color: remaining > 0 ? amberColor : emeraldColor },
    { label: "SETTLEMENT STATUS", val: statusLabel, sub: isFullyPaid ? "Account Settled" : "Installment Active", color: statusColor },
  ];

  stats.forEach((st, idx) => {
    const x = 14 + idx * colW;
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, curY, colW - 2.5, 17, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label, x + 3.5, curY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(st.color[0], st.color[1], st.color[2]);
    doc.text(st.val, x + 3.5, curY + 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(st.sub, x + 3.5, curY + 14.5);
  });

  curY += 23;

  // ── Two Info Context Cards ──
  const halfW = (pageWidth - 28 - 4) / 2;

  // Card 1: Student Information
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, curY, halfW, 35, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.rect(14, curY, halfW, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("BILLED TO — STUDENT PROFILE", 18, curY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.studentName || "Student", 18, curY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Grade / Class: ${data.grade || "10th"}  ·  Board: ${data.boardName || "CBSE"}`, 18, curY + 19);
  doc.text(`Enrolled Batch: ${data.batchName || "Standard Academic Batch"}`, 18, curY + 24);
  doc.text(`Contact: ${data.phone || "—"}  ·  Email: ${data.email || "—"}`, 18, curY + 29);

  // Card 2: Guardian & Billing Information
  const rightX = 14 + halfW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, curY, halfW, 35, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.rect(rightX, curY, halfW, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("GUARDIAN & BILLING CONTEXT", rightX + 4, curY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.parentName || "Parent / Guardian", rightX + 4, curY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice Ref: ${data.invoiceNo || "INV-ADM"}`, rightX + 4, curY + 19);
  doc.text(`Payment Mode: ${(data.paymentMode || "UPI / CASH / BANK").toUpperCase()}`, rightX + 4, curY + 24);
  doc.text(`Fee Status: ${statusLabel} (${pctCleared}% Settled)`, rightX + 4, curY + 29);

  curY += 41;

  // ── 1. Payment Receipts & Ledger History Table ──
  const paymentHistoryRows = (data.paymentHistory && data.paymentHistory.length > 0)
    ? data.paymentHistory.map((ph, idx) => [
        `#${idx + 1}`,
        ph.date || data.date || "—",
        (ph.mode || "CASH").toUpperCase(),
        ph.reference || `REC-${data.invoiceNo}-${idx + 1}`,
        `Rs. ${Number(ph.amount || 0).toLocaleString("en-IN")}`,
        "CLEARED",
      ])
    : feePaid > 0
    ? [
        [
          "#1",
          data.date || "Admission Date",
          (data.paymentMode || "CASH / UPI").toUpperCase(),
          `REC-${data.invoiceNo}`,
          `Rs. ${feePaid.toLocaleString("en-IN")}`,
          "CLEARED",
        ],
      ]
    : [
        [
          "—",
          "—",
          "—",
          "No payments recorded yet",
          "Rs. 0",
          "PENDING",
        ],
      ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("1. TUITION FEE PAYMENT RECEIPTS & LEDGER TRANSACTIONS", 14, curY);
  curY += 2;

  autoTable(doc, {
    startY: curY,
    margin: { left: 14, right: 14 },
    head: [["Receipt #", "Payment Date", "Payment Mode", "Transaction Reference", "Amount Paid", "Status"]],
    body: paymentHistoryRows,
    theme: "grid",
    headStyles: {
      fillColor: [109, 40, 217], // Violet 700
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold" },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 50 },
      4: { cellWidth: 38, fontStyle: "bold", textColor: [16, 185, 129] },
      5: { cellWidth: 26, fontStyle: "bold" },
    },
    didDrawPage: (hookData) => {
      curY = hookData.cursor?.y ? hookData.cursor.y + 8 : curY + 22;
    },
  });

  // ── 2. Scheduled Installment Terms Breakdown Table ──
  if (data.installments && data.installments.length > 0) {
    if (curY > pageHeight - 68) {
      doc.addPage();
      curY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("2. ADJUSTABLE INSTALLMENT SCHEDULE & TERM CLEARANCE", 14, curY);
    curY += 2;

    const installmentRows = data.installments.map((inst) => [
      `Installment #${inst.number}`,
      inst.dueDate || "On Schedule",
      inst.paid ? "PAID & CLEARED" : "DUE / UPCOMING",
      `Rs. ${Number(inst.amount || 0).toLocaleString("en-IN")}`,
    ]);

    autoTable(doc, {
      startY: curY,
      margin: { left: 14, right: 14 },
      head: [["Installment Term", "Scheduled Due Date", "Settlement Status", "Term Amount"]],
      body: installmentRows,
      theme: "grid",
      headStyles: {
        fillColor: [51, 65, 85], // Slate 700
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 45, fontStyle: "bold" },
        3: { cellWidth: 52, fontStyle: "bold", halign: "right" },
      },
      didDrawPage: (hookData) => {
        curY = hookData.cursor?.y ? hookData.cursor.y + 7 : curY + 22;
      },
    });
  }

  // ── Financial Ledger Summary Statement Box ──
  if (curY > pageHeight - 48) {
    doc.addPage();
    curY = 20;
  }

  const boxW = pageWidth - 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, curY, boxW, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("LEDGER TALLY:", 18, curY + 6);
  doc.text(`Total Course Fee: Rs. ${totalFee.toLocaleString("en-IN")}`, 18, curY + 11.5);

  doc.text(`Total Received: Rs. ${feePaid.toLocaleString("en-IN")}`, 85, curY + 6);
  doc.text(`Progress: ${pctCleared}% Cleared`, 85, curY + 11.5);

  doc.setTextColor(remaining > 0 ? amberColor[0] : emeraldColor[0], remaining > 0 ? amberColor[1] : emeraldColor[1], remaining > 0 ? amberColor[2] : emeraldColor[2]);
  doc.text(`Outstanding Dues: Rs. ${remaining.toLocaleString("en-IN")}`, 145, curY + 6);
  doc.text(`Status: ${statusLabel}`, 145, curY + 11.5);

  curY += 21;

  // ── Footer / Authorization Section ──
  const footerY = Math.max(curY + 2, pageHeight - 26);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, pageWidth - 14, footerY);

  // Left Compliance Note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  doc.text("Official Computer-Generated Tax & Tuition Receipt", 14, footerY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("This receipt is verified against database ledger records · Valid without physical signature.", 14, footerY + 8.5);
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")} · Institute Reference: ${instituteCode}`, 14, footerY + 12.5);

  // Right Signatory Stamp Box
  const sigX = pageWidth - 55;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(sigX, footerY + 11, pageWidth - 14, footerY + 11);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text("Authorized Accounts Signatory", sigX + 1, footerY + 14.5);

  // ── Save/Download File ──
  const cleanInvNo = (data.invoiceNo || "Invoice").replace(/[^a-zA-Z0-9-_]/g, "_");
  const cleanStudent = (data.studentName || "Student").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
  const fileName = `Invoice_${cleanInvNo}_${cleanStudent}.pdf`;
  doc.save(fileName);
}
