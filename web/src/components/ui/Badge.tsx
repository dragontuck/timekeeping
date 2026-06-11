import { clsx } from 'clsx';

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
};

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                variantClasses[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}

export function invoiceStatusBadge(status: string) {
    const map: Record<string, BadgeVariant> = {
        DRAFT: 'gray',
        OPEN: 'blue',
        SENT: 'purple',
        RESENT: 'yellow',
        PAID: 'green',
        PAID_CLOSED: 'green',
    };
    return map[status] ?? 'gray';
}
