import { useState } from 'react';
import { useClients } from '../../hooks/useClients';
import { useProjects, useCreateProject, useUpdateProject } from '../../hooks/useProjects';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import type { Project } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    clientId: z.string().min(1, 'Client is required'),
    costPerHour: z.coerce.number().positive('Must be positive').multipleOf(0.01),
    description: z.string().max(1000).optional(),
});
type FormData = z.infer<typeof schema>;

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ProjectsPage() {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editProject, setEditProject] = useState<Project | null>(null);

    const { data: clientsData } = useClients({ isActive: true, limit: 100 });
    const { data, isLoading } = useProjects({ search: search || undefined });
    const createMutation = useCreateProject();
    const updateMutation = useUpdateProject();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const openCreate = () => { reset({ costPerHour: 0 }); setEditProject(null); setIsOpen(true); };
    const openEdit = (project: Project) => {
        reset({
            name: project.name,
            clientId: project.clientId,
            costPerHour: Number(project.costPerHour),
            description: project.description ?? '',
        });
        setEditProject(project);
        setIsOpen(true);
    };
    const closeModal = () => { setIsOpen(false); setEditProject(null); };

    const onSubmit = async (data: FormData) => {
        if (editProject) {
            const reason = window.prompt('Enter an audit note for this project update:')?.trim();
            if (!reason) return;

            await updateMutation.mutateAsync({
                id: editProject.id,
                ...data,
                costPerHour: String(data.costPerHour),
                reason,
            });
        } else {
            await createMutation.mutateAsync(data);
        }
        closeModal();
    };

    const clientOptions = (clientsData?.data ?? []).map((c) => ({ value: c.id, label: c.name }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage billable projects per client</p>
                </div>
                <Button onClick={openCreate}>+ Add Project</Button>
            </div>

            <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
            />

            <Table
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No projects found."
                columns={[
                    { key: 'client', header: 'Client', render: (p) => p.client?.name ?? '—' },
                    { key: 'name', header: 'Project' },
                    { key: 'costPerHour', header: 'Rate/hr', render: (p) => USD.format(Number(p.costPerHour)) },
                    { key: 'description', header: 'Description', render: (p) => p.description ?? '—' },
                    {
                        key: 'isActive', header: 'Status', render: (p) => (
                            <Badge variant={p.isActive ? 'green' : 'red'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                        )
                    },
                    {
                        key: 'actions', header: '', render: (p) => (
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                            </div>
                        )
                    },
                ]}
            />

            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                title={editProject ? 'Edit Project' : 'Add Project'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editProject ? 'Save Changes' : 'Create Project'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Client"
                        required
                        options={clientOptions}
                        placeholder="Select a client..."
                        error={errors.clientId?.message}
                        {...register('clientId')}
                    />
                    <Input label="Project Name" required error={errors.name?.message} {...register('name')} />
                    <Input
                        label="Cost per Hour ($)"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        error={errors.costPerHour?.message}
                        {...register('costPerHour')}
                    />
                    <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                            rows={3}
                            {...register('description')}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
