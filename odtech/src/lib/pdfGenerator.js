import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'
import splashLogo from '../assets/splash.jpg'

let cachedReceiptLogo = null

function loadImageAsDataUrl(src) {
  if (cachedReceiptLogo) {
    return Promise.resolve(cachedReceiptLogo)
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height

      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)

      cachedReceiptLogo = canvas.toDataURL('image/jpeg', 0.92)
      resolve(cachedReceiptLogo)
    }

    image.onerror = () => reject(new Error('Unable to load receipt logo'))
    image.src = src
  })
}

export function generateInvoicePDF(data, type = 'Invoice') {
  const doc = new jsPDF()

  // Primary Color Setup
  const primaryColor = [16, 185, 129] // Tailwind #10B981 emerald-500
  const textColor = [51, 65, 85]

  // Add Company Logo / Name Header
  doc.setFontSize(22)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('O.D TECH ELECTRICAL ENGINEERING SOLUTIONS', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('Accra, Abuyaa Junction, Sowutuom road', 14, 28)
  doc.text('Accra, Ghana', 14, 33)
  doc.text('054 863 1776', 14, 38)
  doc.text('narda144@gmail.com', 14, 43)

  // Document Info
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.text(type.toUpperCase(), 140, 22)
  
  doc.setFontSize(10)
  doc.text(`${type} Number:`, 140, 30)
  doc.text(data.id || `INV-${Date.now().toString().slice(-4)}`, 170, 30)
  
  doc.text('Date:', 140, 35)
  doc.text(formatDate(data.date), 170, 35)

  // Bill To
  doc.setFontSize(12)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('Bill To:', 14, 60)
  
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(data.customer || 'Unknown Customer', 14, 66)

  // Items Table
  const tableData = data.items ? data.items.map((item, index) => [
    index + 1,
    item.desc || 'Services rendered',
    item.qty || 1,
    formatCurrency(item.price || 0),
    formatCurrency((item.qty || 1) * (item.price || 0))
  ]) : [['1', 'General Service', '1', formatCurrency(data.amount), formatCurrency(data.amount)]]

  doc.autoTable({
    startY: 80,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    }
  })

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10
  const rightColX = 140
  
  doc.setFontSize(10)
  doc.text('Subtotal:', rightColX, finalY)
  doc.text(formatCurrency(data.amount || 0), 195, finalY, { align: 'right' })

  // Fixed Tax Example (0%)
  doc.text('Tax (0%):', rightColX, finalY + 7)
  doc.text(formatCurrency(0), 195, finalY + 7, { align: 'right' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Due:', rightColX, finalY + 16)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(formatCurrency(data.amount || 0), 195, finalY + 16, { align: 'right' })

  // Footer notes
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text('Thank you for your business.', 14, 280)

  // Save PDF
  doc.save(`${type.toLowerCase()}_${data.id || Date.now()}.pdf`)
}
export async function generateReceiptPDF(data) {
  const doc = new jsPDF()
  const emerald = [18, 140, 126]
  const emeraldDark = [11, 59, 53]
  const gold = [214, 174, 75]
  const textDark = [29, 43, 58]
  const textSoft = [102, 119, 136]
  const border = [221, 228, 233]
  const paper = [247, 249, 251]
  const receiptNumber = data.receipt_number || `REC-${Date.now().toString().slice(-6)}`
  const receiptDate = formatDate(data.date)
  const customerName = data.customer || 'Walk-in Customer'
  const paymentMethod = data.method || 'Not Specified'
  const amountPaid = formatCurrency(data.amount || 0)
  const amountFontSize = amountPaid.length > 13 ? 14 : amountPaid.length > 10 ? 16 : 19
  const jobReference = data.job_title || 'General service payment'
  const notes = data.notes || 'Payment received in full for services rendered.'
  const wrappedNotes = doc.splitTextToSize(notes, 166)
  const generatedBy = data.generated_by || data.generated_by_email || 'Account user'

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2])
  doc.rect(0, 0, 210, 44, 'F')

  try {
    const logoDataUrl = await loadImageAsDataUrl(splashLogo)
    doc.addImage(logoDataUrl, 'JPEG', 14, 8, 26, 26)
  } catch (error) {
    console.warn(error)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('O.D TECH', 46, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Electrical Engineering Solutions', 46, 25)
  doc.text('Accra, Abuyaa Junction, Sowutuom road', 46, 31)
  doc.text('054 863 1776  |  narda144@gmail.com', 46, 36)

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(142, 8, 54, 26, 6, 6, 'F')
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PAYMENT RECEIPT', 169, 18, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`No. ${receiptNumber}`, 169, 25, { align: 'center' })

  doc.setFillColor(paper[0], paper[1], paper[2])
  doc.roundedRect(14, 52, 112, 40, 8, 8, 'F')
  doc.setFillColor(232, 244, 242)
  doc.roundedRect(130, 52, 66, 40, 8, 8, 'F')

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RECEIVED FROM', 20, 62)
  doc.text('PAYMENT SUMMARY', 142, 62)

  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(customerName, 20, 72)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Job: ${jobReference}`, 20, 80)
  doc.text(`Method: ${paymentMethod}`, 20, 87)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Receipt date', 136, 72)
  doc.text('Amount paid', 136, 84)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(receiptDate, 190, 72, { align: 'right' })
  doc.setTextColor(emerald[0], emerald[1], emerald[2])
  doc.setFontSize(amountFontSize)
  doc.text(amountPaid, 190, 84, { align: 'right' })

  doc.setDrawColor(border[0], border[1], border[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(14, 102, 182, 64, 8, 8)

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RECEIPT DETAILS', 20, 113)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Receipt Number', 20, 124)
  doc.text('Customer', 20, 135)
  doc.text('Payment Method', 20, 146)
  doc.text('Job Reference', 20, 157)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.text(receiptNumber, 72, 124)
  doc.text(customerName, 72, 135)
  doc.text(paymentMethod, 72, 146)
  doc.text(jobReference, 72, 157)

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2])
  doc.roundedRect(130, 114, 58, 40, 7, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('TOTAL RECEIVED', 159, 126, { align: 'center' })
  doc.setFontSize(amountFontSize)
  doc.text(amountPaid, 159, 141, { align: 'center' })

  doc.setFillColor(255, 249, 232)
  doc.roundedRect(14, 176, 182, 46, 8, 8, 'F')
  doc.setTextColor(gold[0], gold[1], gold[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('NOTES', 20, 187)

  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(wrappedNotes, 20, 196)

  doc.setDrawColor(border[0], border[1], border[2])
  doc.line(20, 244, 88, 244)
  doc.line(122, 244, 190, 244)
  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2])
  doc.setFontSize(9)
  doc.text('Prepared by', 20, 250)
  doc.text('Customer acknowledgement', 122, 250)

  doc.setFillColor(232, 244, 242)
  doc.roundedRect(14, 260, 182, 16, 6, 6, 'F')
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Thank you for your payment.', 105, 270, { align: 'center' })

  doc.setTextColor(textSoft[0], textSoft[1], textSoft[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generated by ${generatedBy}`, 14, 286)
  doc.text('This receipt confirms payment received for the stated service.', 196, 286, { align: 'right' })

  doc.save(`receipt_${receiptNumber}.pdf`)
}
