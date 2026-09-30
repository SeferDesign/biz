import PDFDocument from 'pdfkit';

function invoiceNumber(id) {
  return `INV-${String(id).padStart(4, '0')}`;
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
}

export function createInvoicePdf({ invoice, client, lines }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'LETTER', margin: 48 });
    const chunks = [];
    const margin = 48;
    const contentWidth = document.page.width - margin * 2;
    const descriptionWidth = contentWidth - 50 - 90 - 100;

    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    try {
      document.font('Helvetica-Bold').fontSize(24).fillColor('#19372f')
        .text('INVOICE', margin, margin, { width: contentWidth, align: 'right' });
      document.font('Helvetica-Bold').fontSize(10).fillColor('#1c2b27')
        .text(invoiceNumber(invoice.id), margin, 96);
      document.font('Helvetica').fontSize(10).fillColor('#65736d')
        .text(`Issue date: ${invoice.date || '-'}`, margin, 112)
        .text(`Status: ${invoice.status || (invoice.paid ? 'paid' : 'draft')}`, margin, 128)
        .text(`Payment terms: ${client.payment_terms || 'Net 15'}`, margin, 144);

      const billingDetails = [
        client.name || 'Client',
        client.contact,
        client.email || client.email_accounting,
        [client.address1, client.address2, client.city, client.state, client.zipcode].filter(Boolean).join(', ')
      ].filter(Boolean).join('\n');
      document.font('Helvetica-Bold').fontSize(9).fillColor('#19372f').text('BILL TO', margin, 174);
      document.font('Helvetica').fontSize(10).fillColor('#1c2b27')
        .text(billingDetails, margin, 189, { width: contentWidth * 0.58 });

      let tableTop = Math.max(246, 189 + document.heightOfString(billingDetails, { width: contentWidth * 0.58 }) + 30);
      if (invoice.description) {
        document.font('Helvetica').fontSize(10).fillColor('#1c2b27')
          .text(invoice.description, margin, tableTop, { width: contentWidth });
        tableTop += document.heightOfString(invoice.description, { width: contentWidth }) + 18;
      }
      document.y = tableTop;

      function drawTableHeader() {
        const y = document.y;
        document.font('Helvetica-Bold').fontSize(9).fillColor('#19372f');
        document.text('Description', margin, y, { width: descriptionWidth });
        document.text('Hours', margin + descriptionWidth, y, { width: 50, align: 'right' });
        document.text('Rate', margin + descriptionWidth + 50, y, { width: 90, align: 'right' });
        document.text('Amount', margin + descriptionWidth + 140, y, { width: 100, align: 'right' });
        document.moveTo(margin, y + 16).lineTo(margin + contentWidth, y + 16).strokeColor('#cbd6cf').stroke();
        document.y = y + 23;
      }

      drawTableHeader();
      for (const line of lines) {
        const description = line.description || 'Invoice item';
        document.font('Helvetica').fontSize(9).fillColor('#1c2b27');
        const rowHeight = Math.max(25, document.heightOfString(description, { width: descriptionWidth - 12 }) + 12);
        if (document.y + rowHeight > document.page.height - margin - 48) {
          document.addPage();
          drawTableHeader();
        }
        const y = document.y;
        document.text(description, margin + 6, y + 5, { width: descriptionWidth - 12 });
        document.text(line.hours ?? '-', margin + descriptionWidth, y + 5, { width: 50, align: 'right' });
        document.text(line.rate == null ? '-' : formatMoney(line.rate, invoice.currency), margin + descriptionWidth + 50, y + 5, { width: 90, align: 'right' });
        document.text(formatMoney(line.total ?? line.amount, invoice.currency), margin + descriptionWidth + 140, y + 5, { width: 100, align: 'right' });
        document.moveTo(margin, y + rowHeight).lineTo(margin + contentWidth, y + rowHeight).strokeColor('#e2e8e3').stroke();
        document.y = y + rowHeight;
      }

      if (document.y + 40 > document.page.height - margin) document.addPage();
      document.font('Helvetica-Bold').fontSize(11).fillColor('#19372f');
      document.text('Total', margin + contentWidth - 190, document.y + 16, { width: 90, align: 'right' });
      document.text(formatMoney(invoice.cost ?? invoice.total, invoice.currency), margin + contentWidth - 95, document.y + 16, { width: 95, align: 'right' });
      document.end();
    } catch (error) {
      reject(error);
    }
  });
}
