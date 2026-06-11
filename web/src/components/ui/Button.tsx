import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || isLoading}
            className={clsx(
                'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
                {
                    'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500': variant === 'primary',
                    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500': variant === 'secondary',
                    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-primary-500': variant === 'ghost',
                    'px-2.5 py-1.5 text-xs': size === 'sm',
                    'px-4 py-2 text-sm': size === 'md',
                    'px-6 py-3 text-base': size === 'lg',
                },
                className,
            )}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
