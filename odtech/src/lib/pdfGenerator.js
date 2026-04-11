import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";
import splashLogo from "../assets/splash.jpg";

let cachedReceiptLogo = null;

function loadImageAsDataUrl(src) {
  if (cachedReceiptLogo) {
    return Promise.resolve(cachedReceiptLogo);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);

      cachedReceiptLogo = canvas.toDataURL("image/jpeg", 0.92);
      resolve(cachedReceiptLogo);
    };

    image.onerror = () => reject(new Error("Unable to load receipt logo"));
    image.src = src;
  });
}

export async function generateInvoicePDF(data, type = "Invoice") {
  const doc = new jsPDF();
  const emerald = [18, 140, 126];
  const emeraldDark = [11, 59, 53];
  const gold = [214, 174, 75];
  const textDark = [29, 43, 58];
  const textSoft = [102, 119, 136];
  const border = [221, 228, 233];
  const paper = [247, 249, 251];
  const accent = type === "Quote" ? gold : emerald;
  const documentNumber =
    data.document_number ||
    data.id ||
    `${type === "Quote" ? "QUO" : "INV"}-${Date.now().toString().slice(-6)}`;
  const issueDate = formatDate(data.date);
  const customerName = data.customer || "Walk-in Customer";
  const status = data.status || (type === "Quote" ? "Draft" : "Sent");
  const amountTotal = formatCurrency(data.amount || 0);
  const generatedBy =
    data.generated_by || data.generated_by_email || "Account user";
  const items = (data.items || []).length
    ? data.items
    : [{ description: "General Service", qty: 1, price: data.amount || 0 }];

  const tableData = items.map((item, index) => {
    const quantity = Number(item.qty || 1);
    const unitPrice = Number(item.price || 0);

    return [
      index + 1,
      item.description || item.desc || "Services rendered",
      quantity,
      formatCurrency(unitPrice),
      formatCurrency(quantity * unitPrice),
    ];
  });

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.rect(0, 0, 210, 46, "F");

  try {
    const logoDataUrl = await loadImageAsDataUrl(splashLogo);
    doc.addImage(logoDataUrl, "JPEG", 14, 8, 26, 26);
  } catch (error) {
    console.warn(error);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("O.D TECH", 46, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Electrical Engineering Solutions", 46, 25);
  doc.text("Accra, Abuyaa Junction, Sowutuom road", 46, 31);
  doc.text("054 863 1776  |  narda144@gmail.com", 46, 36);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(142, 8, 54, 28, 6, 6, "F");
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(type === "Quote" ? "SALES QUOTE" : "TAX INVOICE", 169, 18, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`No. ${documentNumber}`, 169, 25, { align: "center" });
  doc.text(issueDate, 169, 31, { align: "center" });

  doc.setFillColor(paper[0], paper[1], paper[2]);
  doc.roundedRect(14, 54, 118, 42, 8, 8, "F");
  doc.setFillColor(232, 244, 242);
  doc.roundedRect(136, 54, 60, 42, 8, 8, "F");

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(type === "Quote" ? "PREPARED FOR" : "BILL TO", 20, 64);
  doc.text("DOCUMENT STATUS", 142, 64);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(customerName, 20, 75);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Issue date: ${issueDate}`, 20, 84);
  doc.text(`Items: ${items.length}`, 20, 91);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(type === "Quote" ? "Quoted amount" : "Amount due", 142, 76);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFontSize(13);
  doc.text(status.toUpperCase(), 142, 84);
  doc.setFontSize(amountTotal.length > 13 ? 14 : amountTotal.length > 10 ? 16 : 18);
  doc.text(amountTotal, 190, 91, { align: "right" });

  autoTable(doc, {
    startY: 108,
    head: [["#", "Description", "Qty", "Unit Price", "Line Total"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: emeraldDark, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 252, 253] },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 4,
      textColor: textDark,
      lineColor: border,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 88 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 34, halign: "right" },
      4: { cellWidth: 34, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc.lastAutoTable?.finalY || 108) + 12;

  doc.setFillColor(type === "Quote" ? 255 : 232, type === "Quote" ? 249 : 244, type === "Quote" ? 232 : 242);
  doc.roundedRect(14, finalY, 108, 34, 8, 8, "F");
  doc.setTextColor(type === "Quote" ? gold[0] : emerald[0], type === "Quote" ? gold[1] : emerald[1], type === "Quote" ? gold[2] : emerald[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(type === "Quote" ? "QUOTE NOTES" : "PAYMENT NOTES", 20, finalY + 11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const noteText =
    type === "Quote"
      ? "This quotation is based on the listed services and is subject to confirmation before work begins."
      : "Please confirm payment promptly to keep the project timeline on track.";
  doc.text(doc.splitTextToSize(noteText, 96), 20, finalY + 20);

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.roundedRect(128, finalY, 68, 42, 8, 8);
  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Subtotal", 136, finalY + 11);
  doc.text("Tax", 136, finalY + 19);
  doc.text(type === "Quote" ? "Quoted Total" : "Total Due", 136, finalY + 31);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(amountTotal, 190, finalY + 11, { align: "right" });
  doc.text(formatCurrency(0), 190, finalY + 19, { align: "right" });
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFontSize(13);
  doc.text(amountTotal, 190, finalY + 31, { align: "right" });

  const footerY = Math.min(finalY + 58, 276);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(20, footerY, 88, footerY);
  doc.line(122, footerY, 190, footerY);
  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated by ${generatedBy}`, 20, footerY + 6);
  doc.text(type === "Quote" ? "Client approval" : "Authorized signature", 122, footerY + 6);

  doc.setFontSize(8);
  doc.text(
    type === "Quote"
      ? "Thank you for considering O.D TECH ELECTRICAL ENGINEERING SOLUTIONS."
      : "Thank you for your business.",
    14,
    286,
  );
  doc.text("O.D TECH ELECTRICAL ENGINEERING SOLUTIONS", 196, 286, {
    align: "right",
  });

  doc.save(`${type.toLowerCase()}_${documentNumber}.pdf`);
}
export async function generateReceiptPDF(data) {
  const doc = new jsPDF();
  const emerald = [18, 140, 126];
  const emeraldDark = [11, 59, 53];
  const gold = [214, 174, 75];
  const textDark = [29, 43, 58];
  const textSoft = [102, 119, 136];
  const border = [221, 228, 233];
  const paper = [247, 249, 251];
  const receiptNumber =
    data.receipt_number || `REC-${Date.now().toString().slice(-6)}`;
  const receiptDate = formatDate(data.date);
  const customerName = data.customer || "Walk-in Customer";
  const paymentMethod = data.method || "Not Specified";
  const amountPaid = formatCurrency(data.amount || 0);
  const amountFontSize =
    amountPaid.length > 13 ? 14 : amountPaid.length > 10 ? 16 : 19;
  const jobReference = data.job_title || "General service payment";
  const notes = data.notes || "Payment received in full for services rendered.";
  const wrappedNotes = doc.splitTextToSize(notes, 166);
  const generatedBy =
    data.generated_by || data.generated_by_email || "Account user";

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.rect(0, 0, 210, 44, "F");

  try {
    const logoDataUrl = await loadImageAsDataUrl(splashLogo);
    doc.addImage(logoDataUrl, "JPEG", 14, 8, 26, 26);
  } catch (error) {
    console.warn(error);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("O.D TECH", 46, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Electrical Engineering Solutions", 46, 25);
  doc.text("Accra, Abuyaa Junction, Sowutuom road", 46, 31);
  doc.text("054 863 1776  |  narda144@gmail.com", 46, 36);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(142, 8, 54, 26, 6, 6, "F");
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAYMENT RECEIPT", 169, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`No. ${receiptNumber}`, 169, 25, { align: "center" });

  doc.setFillColor(paper[0], paper[1], paper[2]);
  doc.roundedRect(14, 52, 112, 40, 8, 8, "F");
  doc.setFillColor(232, 244, 242);
  doc.roundedRect(130, 52, 66, 40, 8, 8, "F");

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECEIVED FROM", 20, 62);
  doc.text("PAYMENT SUMMARY", 142, 62);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(customerName, 20, 72);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Job: ${jobReference}`, 20, 80);
  doc.text(`Method: ${paymentMethod}`, 20, 87);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Receipt date", 136, 72);
  doc.text("Amount paid", 136, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(receiptDate, 190, 72, { align: "right" });
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.setFontSize(amountFontSize);
  doc.text(amountPaid, 190, 84, { align: "right" });

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 102, 182, 64, 8, 8);

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECEIPT DETAILS", 20, 113);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Receipt Number", 20, 124);
  doc.text("Customer", 20, 135);
  doc.text("Payment Method", 20, 146);
  doc.text("Job Reference", 20, 157);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(receiptNumber, 72, 124);
  doc.text(customerName, 72, 135);
  doc.text(paymentMethod, 72, 146);
  doc.text(jobReference, 72, 157);

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.roundedRect(130, 114, 58, 40, 7, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TOTAL RECEIVED", 159, 126, { align: "center" });
  doc.setFontSize(amountFontSize);
  doc.text(amountPaid, 159, 141, { align: "center" });

  doc.setFillColor(255, 249, 232);
  doc.roundedRect(14, 176, 182, 46, 8, 8, "F");
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NOTES", 20, 187);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(wrappedNotes, 20, 196);

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(20, 244, 88, 244);
  doc.line(122, 244, 190, 244);
  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFontSize(9);
  doc.text("Prepared by", 20, 250);
  doc.text("Customer acknowledgement", 122, 250);

  doc.setFillColor(232, 244, 242);
  doc.roundedRect(14, 260, 182, 16, 6, 6, "F");
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Thank you for your payment.", 105, 270, { align: "center" });

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated by ${generatedBy}`, 14, 286);
  doc.text(
    "This receipt confirms payment received for the stated service.",
    196,
    286,
    { align: "right" },
  );

  doc.save(`receipt_${receiptNumber}.pdf`);
}
