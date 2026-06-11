import { forwardRef, type SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, placeholder, className, id, ...props }, ref) => {
        const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={clsx(
                        'block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        'disabled:bg-gray-50 disabled:text-gray-500',
                        error ? 'border-red-400' : 'border-gray-300',
                        className,
                    )}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
        );
    },
);
Select.displayName = 'Select';

export default Select;
