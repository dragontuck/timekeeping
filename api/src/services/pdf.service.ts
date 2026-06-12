import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

interface InvoiceForPdf {
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    periodStart: Date;
    periodEnd: Date;
    notes: string | null;
    subtotal: unknown;
    taxRate: unknown;
    taxAmount: unknown;
    total: unknown;
    client: {
        name: string;
        email: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
    };
    user: {
        firstName: string;
        lastName: string;
        email: string;
        companyName?: string | null;
    };
    items: Array<{
        date: Date;
        description: string;
        hours: unknown;
        rate: unknown;
        amount: unknown;
    }>;
}

const COLORS = {
    primary: '#1e40af',   // blue-800
    secondary: '#6b7280', // gray-500
    border: '#e5e7eb',    // gray-200
    text: '#111827',      // gray-900
    muted: '#9ca3af',     // gray-400
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function fmt(v: unknown): string {
    return USD.format(Number(v));
}

export async function generatePdf(invoice: InvoiceForPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER',
            margins: { top: 50, bottom: 50, left: 60, right: 60 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const { width } = doc.page;
        const contentWidth = width - 120;

        // ── Header ──────────────────────────────────────────────────────────────
        doc
            .fillColor(COLORS.primary)
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('INVOICE', 60, 50);

        doc
            .fillColor(COLORS.text)
            .fontSize(10)
            .font('Helvetica')
            .text(`Invoice #: ${invoice.invoiceNumber}`, 60, 85)
            .text(`Issue Date: ${format(invoice.issueDate, 'MMMM d, yyyy')}`)
            .text(`Due Date: ${format(invoice.dueDate, 'MMMM d, yyyy')}`)
            .text(`Period: ${format(invoice.periodStart, 'MMM d')} – ${format(invoice.periodEnd, 'MMM d, yyyy')}`);

        // ── From / Bill To ───────────────────────────────────────────────────────
        const col2x = 350;
        doc
            .fillColor(COLORS.secondary)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('FROM', 60, 160)
            .text('BILL TO', col2x, 160);

        doc
            .fillColor(COLORS.text)
            .fontSize(10)
            .font('Helvetica')
            .text(invoice.user.companyName?.trim() || `${invoice.user.firstName} ${invoice.user.lastName}`, 60, 175)
            .text(invoice.user.email, 60);

        doc
            .fillColor(COLORS.text)
            .font('Helvetica')
            .text(invoice.client.name, col2x, 175);

        if (invoice.client.email) doc.text(invoice.client.email, col2x);
        if (invoice.client.address) doc.text(invoice.client.address, col2x);
        if (invoice.client.city || invoice.client.state || invoice.client.zip) {
            const parts = [invoice.client.city, invoice.client.state, invoice.client.zip].filter(Boolean);
            doc.text(parts.join(', '), col2x);
        }

        // ── Line items table ─────────────────────────────────────────────────────
        const tableTop = 270;
        const colWidths = [85, 230, 55, 70, 80];
        const colX = [60, 145, 375, 430, 500];

        // Header row
        doc.fillColor(COLORS.primary).rect(60, tableTop, contentWidth, 22).fill();
        doc.fillColor('white').font('Helvetica-Bold').fontSize(9);

        const headers = ['Date', 'Description', 'Hours', 'Rate', 'Amount'];
        headers.forEach((h, i) => {
            doc.text(h, colX[i]!, tableTop + 7, { width: colWidths[i]!, align: i >= 2 ? 'right' : 'left' });
        });

        // Rows
        let y = tableTop + 24;
        doc.font('Helvetica').fontSize(9);

        for (const [idx, item] of invoice.items.entries()) {
            if (y > doc.page.height - 180) {
                doc.addPage();
                y = 60;
            }

            // Alternate row background
            if (idx % 2 === 0) {
                doc.fillColor('#f9fafb').rect(60, y, contentWidth, 18).fill();
            }

            doc.fillColor(COLORS.text);
            doc.text(format(item.date, 'MM/dd/yyyy'), colX[0]!, y + 4, { width: colWidths[0]! });
            doc.text(item.description.slice(0, 60), colX[1]!, y + 4, { width: colWidths[1]! });
            doc.text(Number(item.hours).toFixed(2), colX[2]!, y + 4, { width: colWidths[2]!, align: 'right' });
            doc.text(fmt(item.rate), colX[3]!, y + 4, { width: colWidths[3]!, align: 'right' });
            doc.text(fmt(item.amount), colX[4]!, y + 4, { width: colWidths[4]!, align: 'right' });

            y += 20;
        }

        // ── Totals ───────────────────────────────────────────────────────────────
        y += 10;
        doc.strokeColor(COLORS.border).lineWidth(1).moveTo(60, y).lineTo(60 + contentWidth, y).stroke();
        y += 8;

        const labelX = 400;
        const valX = 500;

        doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(9);
        doc.text('Subtotal:', labelX, y).text(fmt(invoice.subtotal), valX, y, { width: 80, align: 'right' });
        y += 16;

        if (Number(invoice.taxRate) > 0) {
            doc.text(`Tax (${Number(invoice.taxRate)}%):`, labelX, y);
            doc.text(fmt(invoice.taxAmount), valX, y, { width: 80, align: 'right' });
            y += 16;
        }

        // Total box
        doc.fillColor(COLORS.primary).rect(labelX - 10, y, 170, 24).fill();
        doc.fillColor('white').font('Helvetica-Bold').fontSize(11);
        doc.text('TOTAL DUE:', labelX, y + 6);
        doc.text(fmt(invoice.total), valX, y + 6, { width: 80, align: 'right' });

        // ── Notes ────────────────────────────────────────────────────────────────
        if (invoice.notes) {
            y += 50;
            doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(9).text('NOTES', 60, y);
            doc.fillColor(COLORS.text).font('Helvetica').fontSize(9).text(invoice.notes, 60, y + 14, {
                width: contentWidth,
            });
        }

        // ── Footer ───────────────────────────────────────────────────────────────
        const footerY = doc.page.height - 40;
        doc
            .fillColor(COLORS.muted)
            .fontSize(8)
            .text('Thank you for your business.', 60, footerY, { align: 'center', width: contentWidth });

        doc.end();
    });
}
