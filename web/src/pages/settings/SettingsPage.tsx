import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const schema = z.object({
    sharedCompanyName: z.string().max(200).optional(),
});
type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
    const { data: settings, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        values: { sharedCompanyName: settings?.sharedCompanyName ?? '' },
    });

    const onSubmit = async (data: FormData) => {
        await updateMutation.mutateAsync({
            sharedCompanyName: data.sharedCompanyName?.trim() || null,
        });
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">System-wide configuration (admin only)</p>
            </div>

            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Shared Invoice Company Name</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Appears as the <strong>From</strong> name on invoices for shared / combined clients.
                        Individual users can override this with their own company name in their profile.
                    </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit) as React.FormEventHandler} className="space-y-4">
                    <Input
                        label="Company Name"
                        placeholder="e.g. Acme Consulting Group"
                        hint="Leave blank to fall back to each user's own company name or full name."
                        error={errors.sharedCompanyName?.message}
                        {...register('sharedCompanyName')}
                    />
                    <Button type="submit" isLoading={updateMutation.isPending}>Save Settings</Button>
                </form>
            </section>
        </div>
    );
}
