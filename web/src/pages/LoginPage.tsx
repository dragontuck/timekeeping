import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    const onSubmit = async (data: FormData) => {
        try {
            await login(data.email, data.password);
        } catch {
            toast.error('Invalid email or password');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">⏰</div>
                    <h1 className="text-2xl font-bold text-gray-900">TimeKeeping</h1>
                    <p className="text-gray-500 text-sm mt-1">Consulting Time Management</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit) as React.FormEventHandler} className="space-y-5">
                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        error={errors.email?.message}
                        required
                        {...register('email')}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        error={errors.password?.message}
                        required
                        {...register('password')}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        isLoading={isSubmitting}
                    >
                        Sign In
                    </Button>
                </form>
            </div>
        </div>
    );
}
