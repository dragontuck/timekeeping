import { clsx } from 'clsx';

interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
}

interface TableProps<T extends { id: string }> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyMessage?: string;
}

export default function Table<T extends { id: string }>({
    columns,
    data,
    isLoading,
    emptyMessage = 'No records found.',
}: TableProps<T>) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={clsx(
                                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                                    col.className,
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : data.length === 0
                            ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 text-sm">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            )
                            : data.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className={clsx('px-4 py-3 text-sm text-gray-900', col.className)}>
                                            {col.render
                                                ? col.render(row)
                                                : String((row as Record<string, unknown>)[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                </tbody>
            </table>
        </div>
    );
}
