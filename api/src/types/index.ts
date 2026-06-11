import { Role } from '../generated/prisma/client';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
    iat?: number;
    exp?: number;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: Role;
}

// ─── Request extension ────────────────────────────────────────────────────────

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportRow {
    clientId: string;
    clientName: string;
    projectId: string;
    projectName: string;
    userId: string;
    userFirstName: string;
    userLastName: string;
    rate: number;
    hours: number;
    cost: number;
}

export interface ReportSummary {
    totalHours: number;
    totalCost: number;
    byClient: Array<{ clientId: string; clientName: string; hours: number; cost: number }>;
    byProject: Array<{ projectId: string; projectName: string; hours: number; cost: number }>;
    rows: ReportRow[];
}

export interface MonthlyReport extends ReportSummary {
    year: number;
    month: number;
}

export interface QuarterlyReport {
    year: number;
    quarter: number;
    months: MonthlyReport[];
    totalHours: number;
    totalCost: number;
}

export interface YearlyReport {
    year: number;
    months: MonthlyReport[];
    quarters: Array<{ quarter: number; hours: number; cost: number }>;
    totalHours: number;
    totalCost: number;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
    date: string;
    description: string;
    hours: number;
    rate: number;
    amount: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    notes: string | null;
    user: { firstName: string; lastName: string; email: string; invoicePrefix: string | null };
    client: { name: string; email: string | null; address: string | null; city: string | null; state: string | null; zip: string | null };
    items: InvoiceLineItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
}
