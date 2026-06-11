import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../../hooks/useClients';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import type { Client } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zip: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ClientsPage() {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editClient, setEditClient] = useState<Client | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useClients({ search: search || undefined });
    const createMutation = useCreateClient();
    const updateMutation = useUpdateClient();
    const deleteMutation = useDeleteClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const openCreate = () => { reset({}); setIsCreateOpen(true); };
    const openEdit = (client: Client) => {
        reset(client as Partial<FormData>);
        setEditClient(client);
    };
    const closeModal = () => { setIsCreateOpen(false); setEditClient(null); reset({}); };

    const onSubmit = async (data: FormData) => {
        if (editClient) {
            await updateMutation.mutateAsync({ id: editClient.id, ...data });
        } else {
            await createMutation.mutateAsync(data);
        }
        closeModal();
    };

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your client list</p>
                </div>
                <Button onClick={openCreate}>+ Add Client</Button>
            </div>

            {/* Search */}
            <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
            />

            <Table
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No clients found."
                columns={[
                    { key: 'name', header: 'Name' },
                    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
                    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
                    {
                        key: 'scope', header: 'Scope', render: (c) => (
                            <Badge variant={c.isShared ? 'blue' : 'gray'}>{c.isShared ? 'Shared' : 'Private'}</Badge>
                        )
                    },
                    {
                        key: 'isActive', header: 'Status', render: (c) => (
                            <Badge variant={c.isActive ? 'green' : 'red'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                        )
                    },
                    {
                        key: 'actions', header: '', render: (c) => (
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                                {user?.role === 'ADMIN' && !c.isShared && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        isLoading={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({ id: c.id, isShared: true })}
                                    >
                                        Make Shared
                                    </Button>
                                )}
                                {c.isActive && (
                                    <Button size="sm" variant="danger" onClick={() => setDeleteId(c.id)}>Disable</Button>
                                )}
                            </div>
                        )
                    },
                ]}
            />

            {/* Create / Edit Modal */}
            <Modal
                isOpen={isCreateOpen || !!editClient}
                onClose={closeModal}
                title={editClient ? 'Edit Client' : 'Add Client'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editClient ? 'Save Changes' : 'Create Client'}
                        </Button>
                    </>
                }
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <Input label="Company Name" required error={errors.name?.message} {...register('name')} />
                    </div>
                    <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                    <Input label="Phone" {...register('phone')} />
                    <div className="col-span-2">
                        <Input label="Address" {...register('address')} />
                    </div>
                    <Input label="City" {...register('city')} />
                    <Input label="State" {...register('state')} />
                    <Input label="ZIP Code" {...register('zip')} />
                    <Input label="Country" {...register('country')} />
                    <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            rows={3}
                            {...register('notes')}
                        />
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => void handleDelete()}
                title="Disable Client"
                message="Are you sure you want to disable this client? Their projects must be disabled first."
                confirmLabel="Disable"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
