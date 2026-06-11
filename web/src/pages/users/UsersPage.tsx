import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDisableUser } from '../../hooks/useUsers';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import type { User } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const createSchema = z.object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    email: z.string().email('Invalid email'),
    password: z.string().min(12).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    role: z.enum(['ADMIN', 'STANDARD']),
});
const editSchema = createSchema.omit({ password: true });
type CreateFormData = z.infer<typeof createSchema>;

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [disableId, setDisableId] = useState<string | null>(null);

    const { data, isLoading } = useUsers();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const disableMutation = useDisableUser();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateFormData>({
        resolver: zodResolver(editUser ? (editSchema as unknown as typeof createSchema) : createSchema),
    });

    const openCreate = () => { reset({ role: 'STANDARD' }); setEditUser(null); setIsOpen(true); };
    const openEdit = (u: User) => {
        reset({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role } as CreateFormData);
        setEditUser(u);
        setIsOpen(true);
    };
    const closeModal = () => { setIsOpen(false); setEditUser(null); };

    const onSubmit = async (data: CreateFormData) => {
        if (editUser) {
            const { password: _, ...editData } = data;
            await updateMutation.mutateAsync({ id: editUser.id, ...editData });
        } else {
            await createMutation.mutateAsync(data);
        }
        closeModal();
    };

    const handleDisable = async () => {
        if (disableId) { await disableMutation.mutateAsync(disableId); setDisableId(null); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage team accounts</p>
                </div>
                <Button onClick={openCreate}>+ Add User</Button>
            </div>

            <Table
                isLoading={isLoading}
                data={data?.data ?? []}
                emptyMessage="No users found."
                columns={[
                    { key: 'name', header: 'Name', render: (u) => `${u.firstName} ${u.lastName}` },
                    { key: 'email', header: 'Email' },
                    {
                        key: 'role', header: 'Role', render: (u) => (
                            <Badge variant={u.role === 'ADMIN' ? 'purple' : 'blue'}>{u.role}</Badge>
                        )
                    },
                    {
                        key: 'isActive', header: 'Status', render: (u) => (
                            <Badge variant={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                        )
                    },
                    {
                        key: 'actions', header: '', render: (u) => (
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                                {u.isActive && u.id !== currentUser?.id && (
                                    <Button size="sm" variant="danger" onClick={() => setDisableId(u.id)}>Disable</Button>
                                )}
                            </div>
                        )
                    },
                ]}
            />

            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                title={editUser ? 'Edit User' : 'Add User'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button
                            onClick={handleSubmit(onSubmit) as React.MouseEventHandler}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editUser ? 'Save Changes' : 'Create User'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" required error={errors.firstName?.message} {...register('firstName')} />
                        <Input label="Last Name" required error={errors.lastName?.message} {...register('lastName')} />
                    </div>
                    <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
                    {!editUser && (
                        <Input
                            label="Password"
                            type="password"
                            required
                            error={(errors as { password?: { message?: string } }).password?.message}
                            hint="Min 12 chars, must include uppercase, number, and special character"
                            {...register('password')}
                        />
                    )}
                    <Select
                        label="Role"
                        options={[{ value: 'STANDARD', label: 'Standard' }, { value: 'ADMIN', label: 'Admin' }]}
                        error={errors.role?.message}
                        {...register('role')}
                    />
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!disableId}
                onClose={() => setDisableId(null)}
                onConfirm={() => void handleDisable()}
                title="Disable User"
                message="This user will no longer be able to sign in. You can re-enable them later by editing."
                confirmLabel="Disable"
                isLoading={disableMutation.isPending}
            />
        </div>
    );
}
