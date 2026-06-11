import { useState } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useTimeEntries, useWeeklyTimeEntries, useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../../hooks/useTimeEntries';
import { useProjects } from '../../hooks/useProjects';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import type { TimeEntry } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

type ViewMode = 'daily' | 'weekly';

const schema = z.object({
    projectId: z.string().min(1, 'Project is required'),
    date: z.string().min(1, 'Date is required'),
    hours: z.coerce.number().positive().max(24).multipleOf(0.25),
    description: z.string().max(1000).optional(),
});
type FormData = z.infer<typeof schema>;

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function TimeEntriesPage() {
    const queryClient = useQueryClient();
    const [view, setView] = useState<ViewMode>('daily');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [weekStart, setWeekStart] = useState(
        format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    );
    const [isOpen, setIsOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: projectsData } = useProjects({ isActive: true, limit: 100 });
    const { data: entries, isLoading: loadingEntries } = useTimeEntries(
        view === 'daily' ? { startDate: date, endDate: date } : {},
    );
    const { data: weeklyData } = useWeeklyTimeEntries(weekStart);

    const createMutation = useCreateTimeEntry();
    const updateMutation = useUpdateTimeEntry();
    const deleteMutation = useDeleteTimeEntry();

    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { date },
    });

    const selectedProjectId = watch('projectId');
    const selectedProject = projectsData?.data.find((p) => p.id === selectedProjectId);

    const openCreate = () => {
        reset({ date, hours: 1, projectId: '', description: '' });
        setEditEntry(null);
        setIsOpen(true);
    };

    const openEdit = (entry: TimeEntry) => {
        if (entry.isBilled) return;
        reset({
            projectId: entry.projectId,
            date: entry.date.split('T')[0],
            hours: Number(entry.hours),
            description: entry.description ?? '',
        });
        setEditEntry(entry);
        setIsOpen(true);
    };

    const closeModal = () => { setIsOpen(false); setEditEntry(null); };

    const refreshTimeEntryData = async () => {
        setIsRefreshing(true);
        try {
            await queryClient.refetchQueries({ queryKey: ['time-entries'], type: 'active' });
        } finally {
            setIsRefreshing(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        if (editEntry) {
            await updateMutation.mutateAsync({ id: editEntry.id, ...data });
        } else {
            await createMutation.mutateAsync(data);
        }
        await refreshTimeEntryData();
        closeModal();
    };

    const projectOptions = (projectsData?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.client.name} / ${p.name} (${USD.format(Number(p.costPerHour))}/hr)`,
    }));

    const days = weeklyData
        ? Array.from({ length: 7 }, (_, i) => {
            const d = format(addDays(new Date(weekStart + 'T00:00:00'), i), 'yyyy-MM-dd');
            return { date: d, label: format(addDays(new Date(weekStart + 'T00:00:00'), i), 'EEE MM/dd'), entries: weeklyData.days[d] ?? [] };
        })
        : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your billable hours</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={refreshTimeEntryData} isLoading={isRefreshing}>
                        Refresh
                    </Button>
                    <Button onClick={openCreate}>+ Add Entry</Button>
                </div>
            </div>

            {/* View toggle */}
            <div className="flex gap-2">
                <Button variant={view === 'daily' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('daily')}>Daily</Button>
                <Button variant={view === 'weekly' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('weekly')}>Weekly</Button>
            </div>

            {view === 'daily' && (
                <>
                    <div className="flex items-center gap-4">
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
                        <span className="text-sm text-gray-500">
                            Total: {(entries?.data ?? []).reduce((s, e) => s + Number(e.hours), 0).toFixed(2)}h
                        </span>
                    </div>
                    <Table
                        data={entries?.data ?? []}
                        isLoading={loadingEntries}
                        emptyMessage="No entries for this day."
                        columns={[
                            { key: 'project', header: 'Client / Project', render: (e) => `${e.project.client.name} / ${e.project.name}` },
                            { key: 'hours', header: 'Hours', render: (e) => Number(e.hours).toFixed(2) },
                            { key: 'amount', header: 'Amount', render: (e) => USD.format(Number(e.hours) * Number(e.project.costPerHour)) },
                            { key: 'description', header: 'Description', render: (e) => e.description ?? '—' },
                            { key: 'status', header: '', render: (e) => e.isBilled ? <Badge variant="green">Billed</Badge> : null },
                            {
                                key: 'actions', header: '',
                                render: (e) => (
                                    <div className="flex gap-2">
                                        {!e.isBilled && <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>}
                                        {!e.isBilled && (
                                            <Button size="sm" variant="danger" onClick={() => setDeleteId(e.id)}>Delete</Button>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </>
            )}

            {view === 'weekly' && (
                <>
                    <div className="flex items-center gap-4">
                        <Input
                            type="date"
                            value={weekStart}
                            onChange={(e) => setWeekStart(e.target.value)}
                            className="w-48"
                            label="Week of (Monday)"
                        />
                        <div className="text-sm text-gray-600">
                            Total: <strong>{(weeklyData?.totalHours ?? 0).toFixed(2)}h</strong> &nbsp;/&nbsp;
                            {USD.format(weeklyData?.totalCost ?? 0)}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="grid gap-4">
                            {days.map(({ date: d, label, entries: dayEntries }) => (
                                <div key={d} className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                                        <span className="text-xs text-gray-500">
                                            {dayEntries.reduce((s, e) => s + Number(e.hours), 0).toFixed(2)}h
                                        </span>
                                    </div>
                                    {dayEntries.length === 0
                                        ? <p className="text-xs text-gray-400">No entries</p>
                                        : dayEntries.map((e) => (
                                            <div key={e.id} className="flex items-center justify-between py-1.5 border-t border-gray-100 first:border-0 text-sm">
                                                <span className="text-gray-700">{e.project.client.name} / {e.project.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-900 font-medium">{Number(e.hours).toFixed(2)}h</span>
                                                    {!e.isBilled && (
                                                        <Button size="sm" variant="ghost" onClick={() => { setValue('date', d); openEdit(e); }}>Edit</Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Entry Form Modal */}
            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                title={editEntry ? 'Edit Time Entry' : 'Add Time Entry'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editEntry ? 'Save Changes' : 'Add Entry'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Project"
                        required
                        options={projectOptions}
                        placeholder="Select a project..."
                        error={errors.projectId?.message}
                        {...register('projectId')}
                    />
                    {selectedProject && (
                        <p className="text-xs text-gray-500">
                            Rate: {USD.format(Number(selectedProject.costPerHour))}/hr
                        </p>
                    )}
                    <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
                    <Input
                        label="Hours"
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        required
                        error={errors.hours?.message}
                        hint="Quarter-hour increments (0.25, 0.50, 0.75, 1.00...)"
                        {...register('hours')}
                    />
                    <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            rows={3}
                            placeholder="What did you work on?"
                            {...register('description')}
                        />
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={async () => { if (deleteId) { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); } }}
                title="Delete Entry"
                message="Delete this time entry? This cannot be undone."
                confirmLabel="Delete"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
