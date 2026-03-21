import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

export function generateInvoicePDF(data, type = 'Invoice') {
  const doc = new jsPDF()

  // Primary Color Setup
  const primaryColor = [16, 185, 129] // Tailwind #10B981 emerald-500
  const textColor = [51, 65, 85]

  // Add Company Logo / Name Header
  doc.setFontSize(22)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('ElectroManager', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('123 Energy Avenue', 14, 28)
  doc.text('Accra, Ghana', 14, 33)
  doc.text('+233 55 555 5555', 14, 38)
  doc.text('billing@electromanager.com', 14, 43)

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
export function generateReceiptPDF(data) {
  const doc = new jsPDF()
  const primaryColor = [16, 185, 129]
  const textColor = [51, 65, 85]

  doc.setFontSize(22)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('ElectroManager', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('Payment Receipt', 140, 22, { align: 'right' })

  // Divider
  doc.setDrawColor(230, 230, 230)
  doc.line(14, 30, 196, 30)

  // Receipt Details
  doc.setFontSize(10)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  
  doc.text('Receipt No:', 14, 45)
  doc.setFont('helvetica', 'bold')
  doc.text(data.receipt_number || `REC-${Date.now().toString().slice(-6)}`, 45, 45)
  
  doc.setFont('helvetica', 'normal')
  doc.text('Date:', 14, 52)
  doc.text(formatDate(data.date), 45, 52)

  doc.text('Customer:', 14, 59)
  doc.text(data.customer || 'Customer', 45, 59)

  doc.text('Payment Method:', 14, 66)
  doc.text(data.method || 'Not Specified', 45, 66)

  if (data.job_title) {
    doc.text('Job Reference:', 14, 73)
    doc.setFont('helvetica', 'bold')
    doc.text(data.job_title, 45, 73)
    doc.setFont('helvetica', 'normal')
  }

  // Amount Box
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(14, 80, 182, 40, 3, 3, 'F')
  
  doc.setFontSize(14)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('Amount Paid', 105, 95, { align: 'center' })
  
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(data.amount || 0), 105, 110, { align: 'center' })

  // Footer
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('Notes:', 14, 140)
  doc.setFontSize(9)
  doc.text(data.notes || 'Payment received in full for services rendered.', 14, 146, { maxWidth: 180 })

  doc.setFontSize(10)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('Total Balance Remaing: GHS 0.00', 105, 170, { align: 'center' })

  doc.setTextColor(150, 150, 150)
  doc.setFontSize(9)
  doc.text('Generated by ElectroManager CRM', 14, 280)
  doc.text('Thank you for choosing ElectroManager!', 196, 280, { align: 'right' })

  doc.save(`receipt_${data.receipt_number || Date.now()}.pdf`)
}
