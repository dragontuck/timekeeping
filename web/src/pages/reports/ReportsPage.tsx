import { useState } from 'react';
import { useMonthlyReport, useQuarterlyReport, useYearlyReport } from '../../hooks/useReports';
import { useClients } from '../../hooks/useClients';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import type { MonthlyReport, QuarterlyReport, YearlyReport } from '../../types';

type ReportType = 'monthly' | 'quarterly' | 'yearly';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const currentYear = new Date().getFullYear();

const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
}));
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}));
const quarterOptions = [
    { value: '1', label: 'Q1 (Jan–Mar)' },
    { value: '2', label: 'Q2 (Apr–Jun)' },
    { value: '3', label: 'Q3 (Jul–Sep)' },
    { value: '4', label: 'Q4 (Oct–Dec)' },
];

export default function ReportsPage() {
    const [type, setType] = useState<ReportType>('monthly');
    const [year, setYear] = useState(String(currentYear));
    const [month, setMonth] = useState(String(new Date().getMonth() + 1));
    const [quarter, setQuarter] = useState('1');
    const [clientId, setClientId] = useState('');

    const { data: clientsData } = useClients({ isActive: true, limit: 100 });

    const monthlyResult = useMonthlyReport(
        type === 'monthly' ? { year: Number(year), month: Number(month), clientId: clientId || undefined } : null,
    );
    const quarterlyResult = useQuarterlyReport(
        type === 'quarterly' ? { year: Number(year), quarter: Number(quarter), clientId: clientId || undefined } : null,
    );
    const yearlyResult = useYearlyReport(
        type === 'yearly' ? { year: Number(year), clientId: clientId || undefined } : null,
    );

    const isLoading = monthlyResult.isLoading || quarterlyResult.isLoading || yearlyResult.isLoading;
    const report = monthlyResult.data ?? quarterlyResult.data ?? yearlyResult.data;

    const clientOptions = [
        { value: '', label: 'All Clients' },
        ...(clientsData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-500 text-sm mt-1">Time and billing summaries</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap gap-4">
                {/* Type toggle */}
                <div className="flex gap-2">
                    {(['monthly', 'quarterly', 'yearly'] as const).map((t) => (
                        <Button
                            key={t}
                            size="sm"
                            variant={type === t ? 'primary' : 'secondary'}
                            onClick={() => setType(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                    ))}
                </div>

                <Select options={yearOptions} value={year} onChange={(e) => setYear(e.target.value)} />
                {type === 'monthly' && (
                    <Select options={monthOptions} value={month} onChange={(e) => setMonth(e.target.value)} />
                )}
                {type === 'quarterly' && (
                    <Select options={quarterOptions} value={quarter} onChange={(e) => setQuarter(e.target.value)} />
                )}
                <Select options={clientOptions} value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>

            {/* Report output */}
            {isLoading && <div className="text-center py-12 text-gray-500">Loading report...</div>}

            {report && type === 'monthly' && <MonthlyReportView report={report as MonthlyReport} />}
            {report && type === 'quarterly' && <QuarterlyReportView report={report as QuarterlyReport} />}
            {report && type === 'yearly' && <YearlyReportView report={report as YearlyReport} />}
        </div>
    );
}

function MonthlyReportView({ report }: { report: MonthlyReport }) {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">
                        {new Date(report.year, report.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="text-sm text-gray-600">
                        <strong>{report.totalHours.toFixed(2)}h</strong> &nbsp;|&nbsp; {USD.format(report.totalCost)}
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Client', 'Project', 'Hours', 'Amount'].map((h) => (
                                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {report.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{row.clientName}</td>
                                <td className="px-4 py-3">{row.projectName}</td>
                                <td className="px-4 py-3">{row.hours.toFixed(2)}</td>
                                <td className="px-4 py-3 font-medium">{USD.format(row.cost)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                            <td className="px-4 py-3 font-semibold" colSpan={2}>Total</td>
                            <td className="px-4 py-3 font-semibold">{report.totalHours.toFixed(2)}</td>
                            <td className="px-4 py-3 font-semibold">{USD.format(report.totalCost)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function QuarterlyReportView({ report }: { report: QuarterlyReport }) {
    return (
        <div className="space-y-6">
            {report.months.map((m, i) => <MonthlyReportView key={i} report={m} />)}
            <div className="bg-primary-50 rounded-xl border border-primary-100 px-5 py-4 flex justify-between">
                <span className="font-semibold text-primary-900">Q{report.quarter} {report.year} Total</span>
                <span className="font-semibold text-primary-900">
                    {report.totalHours.toFixed(2)}h &nbsp;|&nbsp; {USD.format(report.totalCost)}
                </span>
            </div>
        </div>
    );
}

function YearlyReportView({ report }: { report: YearlyReport }) {
    return (
        <div className="space-y-6">
            {report.quarters.map((q, i) => (
                <div key={i} className="bg-primary-50 rounded-xl border border-primary-100 px-5 py-4 flex justify-between">
                    <span className="font-semibold text-primary-900">Q{q.quarter} Total</span>
                    <span className="font-semibold text-primary-900">
                        {q.hours.toFixed(2)}h &nbsp;|&nbsp; {USD.format(q.cost)}
                    </span>
                </div>
            ))}
            <div className="bg-gray-900 text-white rounded-xl px-5 py-4 flex justify-between">
                <span className="font-semibold">Full Year {report.year} Total</span>
                <span className="font-semibold">
                    {report.totalHours.toFixed(2)}h &nbsp;|&nbsp; {USD.format(report.totalCost)}
                </span>
            </div>
        </div>
    );
}
