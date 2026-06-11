// ─── Domain types mirroring the API response shapes ──────────────────────────

export type Role = 'ADMIN' | 'STANDARD';
export type AlertType = 'DAILY' | 'WEEKLY';
export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'SENT' | 'RESENT' | 'PAID' | 'PAID_CLOSED';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    invoicePrefix: string | null;
    /** Gmail address used to send invoices/alerts. Null if not configured. */
    gmailUser: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Client {
    id: string;
    ownerId: string | null;
    isShared: boolean;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    clientId: string;
    name: string;
    description: string | null;
    costPerHour: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    client: { id: string; name: string };
}

export interface TimeEntry {
    id: string;
    userId: string;
    projectId: string;
    date: string;
    hours: string;
    description: string | null;
    isBilled: boolean;
    createdAt: string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        costPerHour: string;
        client: { id: string; name: string };
    };
    user?: { id: string; firstName: string; lastName: string };
}

export interface Alert {
    id: string;
    userId: string;
    projectId: string;
    type: AlertType;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        client: { id: string; name: string };
    };
}

export interface InvoiceItem {
    id: string;
    invoiceId: string;
    timeEntryId: string | null;
    date: string;
    description: string;
    hours: string;
    rate: string;
    amount: string;
}

export interface Invoice {
    id: string;
    userId: string;
    clientId: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    notes: string | null;
    sentAt: string | null;
    resentAt: string | null;
    paidAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    client: Client;
    user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'invoicePrefix'>;
    items?: InvoiceItem[];
    _count?: { items: number };
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
    data: T;
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

export interface MonthlyReport {
    year: number;
    month: number;
    rows: ReportRow[];
    totalHours: number;
    totalCost: number;
    byClient: Array<{ clientId: string; clientName: string; hours: number; cost: number }>;
    byProject: Array<{ projectId: string; projectName: string; hours: number; cost: number }>;
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

// ─── Weekly view ──────────────────────────────────────────────────────────────

export interface WeeklyData {
    days: Record<string, TimeEntry[]>;
    totalHours: number;
    totalCost: number;
    weekStart: string;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export type AuditEntityType = 'PROJECT' | 'TIME_ENTRY';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
    id: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    changedById: string;
    reason: string | null;
    previousData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    createdAt: string;
    changedBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}
