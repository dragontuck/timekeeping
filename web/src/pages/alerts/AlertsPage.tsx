import { useState } from 'react';
import { useAlerts, useCreateAlert, useToggleAlert, useDeleteAlert } from '../../hooks/useAlerts';
import { useProjects } from '../../hooks/useProjects';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    projectId: z.string().min(1, 'Project is required'),
    type: z.enum(['DAILY', 'WEEKLY']),
});
type FormData = z.infer<typeof schema>;

export default function AlertsPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useAlerts();
    const { data: projectsData } = useProjects({ isActive: true, limit: 100 });
    const createMutation = useCreateAlert();
    const toggleMutation = useToggleAlert();
    const deleteMutation = useDeleteAlert();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { type: 'DAILY' },
    });

    const onSubmit = async (data: FormData) => {
        await createMutation.mutateAsync(data);
        setIsOpen(false);
        reset({ type: 'DAILY' });
    };

    const projectOptions = (projectsData?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.client.name} / ${p.name}`,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Daily (9AM Mon–Fri) and weekly (4PM Friday) reminders
                    </p>
                </div>
                <Button onClick={() => { reset({ type: 'DAILY' }); setIsOpen(true); }}>+ Add Alert</Button>
            </div>

            <Table
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No alerts configured."
                columns={[
                    { key: 'client', header: 'Client', render: (a) => a.project?.client?.name ?? '—' },
                    { key: 'project', header: 'Project', render: (a) => a.project?.name ?? '—' },
                    {
                        key: 'type', header: 'Type', render: (a) => (
                            <Badge variant={a.type === 'DAILY' ? 'blue' : 'purple'}>{a.type}</Badge>
                        )
                    },
                    {
                        key: 'isEnabled', header: 'Status', render: (a) => (
                            <Badge variant={a.isEnabled ? 'green' : 'gray'}>{a.isEnabled ? 'Active' : 'Paused'}</Badge>
                        )
                    },
                    {
                        key: 'actions', header: '', render: (a) => (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={a.isEnabled ? 'secondary' : 'primary'}
                                    isLoading={toggleMutation.isPending}
                                    onClick={() => toggleMutation.mutate({ id: a.id, isEnabled: !a.isEnabled })}
                                >
                                    {a.isEnabled ? 'Pause' : 'Enable'}
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setDeleteId(a.id)}>Delete</Button>
                            </div>
                        )
                    },
                ]}
            />

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Add Alert"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending}
                        >
                            Create Alert
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
                    <Select
                        label="Alert Type"
                        required
                        options={[
                            { value: 'DAILY', label: 'Daily — 9AM Mon–Fri' },
                            { value: 'WEEKLY', label: 'Weekly — 4PM Friday' },
                        ]}
                        error={errors.type?.message}
                        {...register('type')}
                    />
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={async () => { if (deleteId) { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); } }}
                title="Delete Alert"
                message="Are you sure you want to delete this alert?"
                confirmLabel="Delete"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
