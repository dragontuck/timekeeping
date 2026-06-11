import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoices, useCreateInvoice, useDeleteInvoice } from '../../hooks/useInvoices';
import { useClients } from '../../hooks/useClients';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge, { invoiceStatusBadge } from '../../components/ui/Badge';
import type { InvoiceStatus } from '../../types';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    clientId: z.string().min(1, 'Client is required'),
    periodStart: z.string().min(1, 'Required'),
    periodEnd: z.string().min(1, 'Required'),
    dueDate: z.string().min(1, 'Required'),
    notes: z.string().max(2000).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
});
type FormData = z.infer<typeof schema>;

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'OPEN', label: 'Open' },
    { value: 'SENT', label: 'Sent' },
    { value: 'RESENT', label: 'Resent' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PAID_CLOSED', label: 'Paid & Closed' },
];

export default function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useInvoices(statusFilter ? { status: statusFilter as InvoiceStatus } : {});
    const { data: clientsData } = useClients({ isActive: true, limit: 100 });
    const createMutation = useCreateInvoice();
    const deleteMutation = useDeleteInvoice();

    const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { taxRate: 0 },
    });

    const selectedClientId = watch('clientId');
    const startDate = watch('periodStart');
    const endDate = watch('periodEnd');

    const { data: entriesPreview } = useTimeEntries(
        selectedClientId && startDate && endDate
            ? { clientId: selectedClientId, startDate, endDate, isBilled: false, limit: 100 }
            : {},
    );

    const totalPreview = (entriesPreview?.data ?? []).reduce(
        (s, e) => s + Number(e.hours) * Number(e.project.costPerHour), 0,
    );

    const onSubmit = async (data: FormData) => {
        const timeEntryIds = (entriesPreview?.data ?? []).map((e) => e.id);
        if (timeEntryIds.length === 0) { return; }
        await createMutation.mutateAsync({
            ...data,
            issueDate: new Date().toISOString().slice(0, 10),
            timeEntryIds,
        });
        setIsOpen(false);
        reset({ taxRate: 0 });
    };

    const clientOptions = [
        { value: '', label: 'Select a client...' },
        ...(clientsData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and send client invoices</p>
                </div>
                <Button onClick={() => { reset({ taxRate: 0 }); setIsOpen(true); }}>+ Create Invoice</Button>
            </div>

            <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="max-w-xs"
            />

            <Table
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No invoices found."
                columns={[
                    {
                        key: 'invoiceNumber', header: 'Invoice #', render: (i) => (
                            <Link to={`/invoices/${i.id}`} className="text-primary-600 font-medium hover:underline">
                                {i.invoiceNumber}
                            </Link>
                        )
                    },
                    { key: 'client', header: 'Client', render: (i) => i.client.name },
                    {
                        key: 'periodStart', header: 'Period', render: (i) => (
                            `${format(new Date(i.periodStart), 'MMM d')} – ${format(new Date(i.periodEnd), 'MMM d, yyyy')}`
                        )
                    },
                    {
                        key: 'status', header: 'Status', render: (i) => (
                            <Badge variant={invoiceStatusBadge(i.status)}>{i.status}</Badge>
                        )
                    },
                    { key: 'total', header: 'Total', render: (i) => USD.format(Number(i.total)) },
                    { key: 'dueDate', header: 'Due', render: (i) => i.dueDate ? format(new Date(i.dueDate), 'MMM d, yyyy') : '—' },
                    {
                        key: 'actions', header: '', render: (i) => (
                            <div className="flex gap-2">
                                <Link to={`/invoices/${i.id}`}>
                                    <Button size="sm" variant="ghost">View</Button>
                                </Link>
                                {i.status === 'DRAFT' && (
                                    <Button size="sm" variant="danger" onClick={() => setDeleteId(i.id)}>Delete</Button>
                                )}
                            </div>
                        )
                    },
                ]}
            />

            {/* Create Invoice Modal */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Create Invoice"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending}
                            disabled={(entriesPreview?.data.length ?? 0) === 0}
                        >
                            Create Invoice ({(entriesPreview?.data.length ?? 0)} entries, {USD.format(totalPreview)})
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Client"
                        required
                        options={clientOptions}
                        error={errors.clientId?.message}
                        {...register('clientId')}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Period Start" type="date" required error={errors.periodStart?.message} {...register('periodStart')} />
                        <Input label="Period End" type="date" required error={errors.periodEnd?.message} {...register('periodEnd')} />
                    </div>
                    <Input label="Due Date" type="date" required error={errors.dueDate?.message} {...register('dueDate')} />
                    <Input
                        label="Tax Rate (%)"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        error={errors.taxRate?.message}
                        {...register('taxRate')}
                    />
                    <div>
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                            rows={3}
                            placeholder="Payment terms, notes..."
                            {...register('notes')}
                        />
                    </div>

                    {selectedClientId && startDate && endDate && (
                        <div className={`rounded-lg p-3 text-sm ${(entriesPreview?.data.length ?? 0) === 0
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                            {(entriesPreview?.data.length ?? 0) === 0
                                ? 'No unbilled time entries found for this client in the selected period.'
                                : `Found ${entriesPreview?.data.length} unbilled entries totalling ${USD.format(totalPreview)}`}
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={async () => { if (deleteId) { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); } }}
                title="Delete Invoice"
                message="Delete this draft invoice? Time entries will be marked as unbilled again."
                confirmLabel="Delete"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
