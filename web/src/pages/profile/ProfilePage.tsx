import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateUser } from '../../hooks/useUsers';
import { api } from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

const profileSchema = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    invoicePrefix: z.string().max(20).optional(),
});
const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(12).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
const gmailSchema = z.object({
    gmailUser: z.string().email('Must be a valid Gmail address').or(z.literal('')),
    gmailAppPassword: z.string().length(16, 'App Password must be exactly 16 characters').or(z.literal('')),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type GmailForm = z.infer<typeof gmailSchema>;

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const updateMutation = useUpdateUser();

    const { register: regProfile, handleSubmit: hsProfile, formState: { errors: pe, isSubmitting: ps } } =
        useForm<ProfileForm>({
            resolver: zodResolver(profileSchema), defaultValues: {
                firstName: user?.firstName ?? '',
                lastName: user?.lastName ?? '',
                email: user?.email ?? '',
                invoicePrefix: user?.invoicePrefix ?? '',
            }
        });

    const { register: regPwd, handleSubmit: hsPwd, formState: { errors: pwe, isSubmitting: pws }, reset: resetPwd } =
        useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

    const { register: regGmail, handleSubmit: hsGmail, formState: { errors: ge, isSubmitting: gs }, reset: resetGmail } =
        useForm<GmailForm>({
            resolver: zodResolver(gmailSchema),
            defaultValues: { gmailUser: user?.gmailUser ?? '', gmailAppPassword: '' },
        });

    const onSaveProfile = async (data: ProfileForm) => {
        if (!user) return;
        await updateMutation.mutateAsync({ id: user.id, ...data });
        await refreshUser();
        toast.success('Profile updated');
    };

    const onChangePassword = async (data: PasswordForm) => {
        try {
            await api.patch('/v1/users/me/password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            resetPwd();
            toast.success('Password changed — please sign in again');
        } catch (err) {
            const msg = ((err as AxiosError<{ message: string }>).response?.data?.message) ?? 'Failed to change password';
            toast.error(msg);
        }
    };

    const onSaveGmail = async (data: GmailForm) => {
        if (!user) return;
        try {
            await api.patch(`/v1/users/${user.id}`, {
                gmailUser: data.gmailUser || '',
                gmailAppPassword: data.gmailAppPassword,
            });
            resetGmail({ gmailUser: data.gmailUser, gmailAppPassword: '' });
            await refreshUser();
            toast.success(data.gmailUser ? 'Gmail credentials saved' : 'Gmail credentials cleared');
        } catch (err) {
            const msg = ((err as AxiosError<{ message: string }>).response?.data?.message) ?? 'Failed to save Gmail settings';
            toast.error(msg);
        }
    };

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your personal information</p>
            </div>

            {/* Profile section */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <form onSubmit={hsProfile(onSaveProfile) as React.FormEventHandler} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" required error={pe.firstName?.message} {...regProfile('firstName')} />
                        <Input label="Last Name" required error={pe.lastName?.message} {...regProfile('lastName')} />
                    </div>
                    <Input label="Email" type="email" required error={pe.email?.message} {...regProfile('email')} />
                    <Input
                        label="Invoice Number Prefix"
                        placeholder="e.g. ACME"
                        hint="Used in invoice numbers: PREFIX-YYYY-NNNN. Leave blank to use INV."
                        error={pe.invoicePrefix?.message}
                        {...regProfile('invoicePrefix')}
                    />
                    <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">{user?.role}</p>
                    </div>
                    <Button type="submit" isLoading={ps}>Save Changes</Button>
                </form>
            </section>

            {/* Gmail Integration section */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Gmail Integration</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Invoices and alert emails are sent from your Gmail account.
                        Use a{' '}
                        <a
                            href="https://support.google.com/accounts/answer/185833"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                        >
                            Gmail App Password
                        </a>
                        {' '}— not your regular password.
                    </p>
                </div>

                {user?.gmailUser && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        <span>✓</span>
                        <span>Configured: <strong>{user.gmailUser}</strong></span>
                    </div>
                )}

                <form onSubmit={hsGmail(onSaveGmail) as React.FormEventHandler} className="space-y-4">
                    <Input
                        label="Gmail Address"
                        type="email"
                        placeholder="you@gmail.com"
                        hint="Leave blank to disable Gmail sending."
                        error={ge.gmailUser?.message}
                        {...regGmail('gmailUser')}
                    />
                    <Input
                        label="App Password"
                        type="password"
                        placeholder="16-character app password"
                        hint="Always re-enter your App Password to confirm changes. Leave blank to keep the current password unchanged."
                        error={ge.gmailAppPassword?.message}
                        {...regGmail('gmailAppPassword')}
                    />
                    <Button type="submit" isLoading={gs}>Save Gmail Settings</Button>
                </form>
            </section>

            {/* Password section */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                <form onSubmit={hsPwd(onChangePassword) as React.FormEventHandler} className="space-y-4">
                    <Input label="Current Password" type="password" required error={pwe.currentPassword?.message} {...regPwd('currentPassword')} />
                    <Input
                        label="New Password"
                        type="password"
                        required
                        error={pwe.newPassword?.message}
                        hint="Min 12 chars, must include uppercase, number, and special character"
                        {...regPwd('newPassword')}
                    />
                    <Input label="Confirm New Password" type="password" required error={pwe.confirmPassword?.message} {...regPwd('confirmPassword')} />
                    <Button type="submit" isLoading={pws}>Change Password</Button>
                </form>
            </section>
        </div>
    );
}
