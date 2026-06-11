import { useState } from 'react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { format } from 'date-fns';
import type { AuditLog } from '../../types';

const ENTITY_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'TIME_ENTRY', label: 'Time Entry' },
];

const ACTION_BADGE: Record<string, 'green' | 'blue' | 'red'> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
};

function DataCell({ value }: { value: Record<string, unknown> | null }) {
    if (!value) return <span className="text-gray-400">—</span>;
    return (
        <pre className="text-xs text-gray-600 whitespace-pre-wrap max-w-xs overflow-auto bg-gray-50 rounded p-1">
            {JSON.stringify(value, null, 2)}
        </pre>
    );
}

export default function AuditLogPage() {
    const [entityType, setEntityType] = useState<'' | 'PROJECT' | 'TIME_ENTRY'>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useAuditLogs({
        entityType: entityType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 25,
    });

    const totalPages = data?.meta.totalPages ?? 1;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Full history of project and time-entry changes — who changed what, when, and why.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <Select
                    options={ENTITY_OPTIONS}
                    value={entityType}
                    onChange={(e) => { setEntityType(e.target.value as typeof entityType); setPage(1); }}
                    className="w-44"
                />
                <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    placeholder="From"
                    className="w-40"
                />
                <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    placeholder="To"
                    className="w-40"
                />
            </div>

            <Table<AuditLog>
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No audit records found."
                columns={[
                    {
                        key: 'createdAt', header: 'When',
                        render: (r) => (
                            <span className="text-sm text-gray-700 whitespace-nowrap">
                                {format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')}
                            </span>
                        ),
                    },
                    {
                        key: 'action', header: 'Action',
                        render: (r) => (
                            <Badge variant={ACTION_BADGE[r.action] ?? 'gray'}>{r.action}</Badge>
                        ),
                    },
                    {
                        key: 'entityType', header: 'Entity',
                        render: (r) => (
                            <div className="text-sm">
                                <span className="font-medium text-gray-700">{r.entityType.replace('_', ' ')}</span>
                                <p className="text-xs text-gray-400 font-mono truncate max-w-[8rem]">{r.entityId}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'changedBy', header: 'Changed By',
                        render: (r) => (
                            <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                    {r.changedBy.firstName} {r.changedBy.lastName}
                                </span>
                                <p className="text-xs text-gray-400">{r.changedBy.email}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'reason', header: 'Reason',
                        render: (r) => r.reason
                            ? <span className="text-sm text-gray-700">{r.reason}</span>
                            : <span className="text-gray-400 text-sm">—</span>,
                    },
                    {
                        key: 'previousData', header: 'Before',
                        render: (r) => <DataCell value={r.previousData} />,
                    },
                    {
                        key: 'newData', header: 'After',
                        render: (r) => <DataCell value={r.newData} />,
                    },
                ]}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center gap-3 justify-end text-sm">
                    <button
                        className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="text-gray-600">Page {page} / {totalPages}</span>
                    <button
                        className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
