import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.util';

interface InvoiceEmailOptions {
    to: string;
    clientName: string;
    invoiceNumber: string;
    total: number;
    dueDate: string;
    pdfBuffer: Buffer;
    isResend: boolean;
}

interface AlertEmailOptions {
    to: string;
    firstName: string;
    missingProjects: Array<{ projectName: string; clientName: string }>;
}

interface WeeklySummaryEmailOptions {
    to: string;
    firstName: string;
    weekRange: string;
    summaries: Array<{ projectName: string; clientName: string; hours: number; cost: number }>;
    totalHours: number;
    totalCost: number;
}

export interface GmailCredentials {
    gmailUser: string;
    gmailAppPassword: string;
}

function createTransporter(creds: GmailCredentials) {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: creds.gmailUser,
            pass: creds.gmailAppPassword,
        },
    });
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function sendInvoiceEmail(options: InvoiceEmailOptions, creds: GmailCredentials): Promise<void> {
    if (!creds.gmailUser || !creds.gmailAppPassword) {
        logger.warn('Gmail not configured – skipping invoice email send');
        return;
    }

    const subject = options.isResend
        ? `[Reminder] Invoice ${options.invoiceNumber}`
        : `Invoice ${options.invoiceNumber}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${options.isResend ? 'Invoice Reminder' : 'New Invoice'}</h1>
      </div>
      <div style="padding: 32px;">
        <p>Dear ${options.clientName},</p>
        <p>${options.isResend ? 'This is a reminder regarding' : 'Please find attached'} invoice <strong>${options.invoiceNumber}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
            <td style="padding: 8px 0; font-weight: bold;">${options.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #1e40af;">${USD.format(options.total)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
            <td style="padding: 8px 0;">${options.dueDate}</td>
          </tr>
        </table>
        <p>The invoice PDF is attached to this email. Please don't hesitate to reach out with any questions.</p>
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;

    const transporter = createTransporter(creds);

    await transporter.sendMail({
        from: creds.gmailUser,
        to: options.to,
        subject,
        html,
        attachments: [
            {
                filename: `${options.invoiceNumber}.pdf`,
                content: options.pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });

    logger.info('Invoice email sent', { to: options.to, invoice: options.invoiceNumber });
}

export async function sendDailyReminderEmail(options: AlertEmailOptions, creds: GmailCredentials): Promise<void> {
    if (!creds.gmailUser || !creds.gmailAppPassword) {
        logger.warn('Gmail not configured – skipping daily reminder email');
        return;
    }

    const projectList = options.missingProjects
        .map((p) => `<li><strong>${p.clientName}</strong> / ${p.projectName}</li>`)
        .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">⏰ Daily Time Entry Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi ${options.firstName},</p>
        <p>Don't forget to log your time for today! The following projects are missing entries:</p>
        <ul style="margin: 16px 0; padding-left: 20px; line-height: 1.8;">${projectList}</ul>
        <p>Log in to <a href="https://web.timekeeping.local">TimeKeeping</a> to add your entries.</p>
      </div>
    </body>
    </html>
  `;

    const transporter = createTransporter(creds);
    await transporter.sendMail({
        from: creds.gmailUser,
        to: options.to,
        subject: '⏰ Daily Time Entry Reminder',
        html,
    });

    logger.info('Daily reminder sent', { to: options.to });
}

export async function sendWeeklySummaryEmail(options: WeeklySummaryEmailOptions, creds: GmailCredentials): Promise<void> {
    if (!creds.gmailUser || !creds.gmailAppPassword) {
        logger.warn('Gmail not configured – skipping weekly summary email');
        return;
    }

    const rows = options.summaries
        .map(
            (s) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.clientName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.projectName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${s.hours.toFixed(2)}h</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${USD.format(s.cost)}</td>
      </tr>`,
        )
        .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">📊 Weekly Time Summary</h1>
        <p style="color: #ede9fe; margin: 8px 0 0;">${options.weekRange}</p>
      </div>
      <div style="padding: 32px;">
        <p>Hi ${options.firstName}, here's your time summary for ${options.weekRange}:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 8px; text-align: left;">Client</th>
              <th style="padding: 10px 8px; text-align: left;">Project</th>
              <th style="padding: 10px 8px; text-align: right;">Hours</th>
              <th style="padding: 10px 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background: #7c3aed; color: white;">
              <td colspan="2" style="padding: 10px 8px; font-weight: bold;">TOTAL</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold;">${options.totalHours.toFixed(2)}h</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold;">${USD.format(options.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
        <p>Log in to <a href="https://web.timekeeping.local">TimeKeeping</a> to view detailed reports.</p>
      </div>
    </body>
    </html>
  `;

    const transporter = createTransporter(creds);
    await transporter.sendMail({
        from: creds.gmailUser,
        to: options.to,
        subject: `📊 Weekly Summary – ${options.weekRange}`,
        html,
    });

    logger.info('Weekly summary sent', { to: options.to });
}
