import { useAuth } from '../hooks/useAuth';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useInvoices } from '../hooks/useInvoices';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import Badge, { invoiceStatusBadge } from '../components/ui/Badge';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function DashboardPage() {
    const { user } = useAuth();
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const { data: todayEntries } = useTimeEntries({ startDate: today, endDate: today });
    const { data: weekEntries } = useTimeEntries({ startDate: weekStart, endDate: weekEnd });
    const { data: openInvoices } = useInvoices({ status: 'OPEN' });
    const { data: sentInvoices } = useInvoices({ status: 'SENT' });

    const todayHours = (todayEntries?.data ?? []).reduce((s, e) => s + Number(e.hours), 0);
    const weekHours = (weekEntries?.data ?? []).reduce((s, e) => s + Number(e.hours), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.firstName}! 👋
                </h1>
                <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Today's Hours" value={`${todayHours.toFixed(2)}h`} icon="⏱️" color="blue" />
                <StatCard label="This Week's Hours" value={`${weekHours.toFixed(2)}h`} icon="📅" color="purple" />
                <StatCard label="Open Invoices" value={String(openInvoices?.meta.total ?? 0)} icon="🧾" color="yellow" />
                <StatCard label="Sent Invoices" value={String(sentInvoices?.meta.total ?? 0)} icon="📤" color="green" />
            </div>

            {/* Today's entries */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Today's Time Entries</h2>
                    <Link to="/time-entries" className="text-sm text-primary-600 hover:underline">
                        View all →
                    </Link>
                </div>
                {(todayEntries?.data.length ?? 0) === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No entries logged today yet.</p>
                        <Link
                            to="/time-entries"
                            className="inline-block mt-3 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800"
                        >
                            + Log Time
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {todayEntries?.data.slice(0, 5).map((e) => (
                            <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {e.project.client.name} / {e.project.name}
                                    </p>
                                    {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">{Number(e.hours).toFixed(2)}h</p>
                                    <p className="text-xs text-gray-500">
                                        {USD.format(Number(e.hours) * Number(e.project.costPerHour))}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent invoices */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
                    <Link to="/invoices" className="text-sm text-primary-600 hover:underline">View all →</Link>
                </div>
                {((openInvoices?.data.length ?? 0) + (sentInvoices?.data.length ?? 0)) === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">No open or sent invoices.</p>
                ) : (
                    <div className="space-y-2">
                        {[...(openInvoices?.data ?? []), ...(sentInvoices?.data ?? [])].slice(0, 5).map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                                    <p className="text-xs text-gray-500">{inv.client.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={invoiceStatusBadge(inv.status)}>{inv.status}</Badge>
                                    <p className="text-sm font-semibold">{USD.format(Number(inv.total))}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: {
    label: string;
    value: string;
    icon: string;
    color: 'blue' | 'purple' | 'yellow' | 'green';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700',
        purple: 'bg-purple-50 text-purple-700',
        yellow: 'bg-yellow-50 text-yellow-700',
        green: 'bg-green-50 text-green-700',
    };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl ${colorClasses[color]}`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
    );
}
