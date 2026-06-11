import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clsx } from 'clsx';

interface NavItem {
    to: string;
    label: string;
    icon: string;
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/time-entries', label: 'Time Entries', icon: '⏱️' },
    { to: '/clients', label: 'Clients', icon: '🏢' },
    { to: '/projects', label: 'Projects', icon: '📋' },
    { to: '/invoices', label: 'Invoices', icon: '🧾' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { to: '/alerts', label: 'Alerts', icon: '🔔' },
    { to: '/users', label: 'Users', icon: '👥', adminOnly: true },
    { to: '/audit-log', label: 'Audit Log', icon: '🔍', adminOnly: true },
    { to: '/profile', label: 'Profile', icon: '👤' },
];

export function Sidebar() {
    const { user } = useAuth();

    return (
        <aside className="w-60 bg-primary-900 flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-primary-700">
                <h1 className="text-white font-bold text-lg leading-tight">
                    ⏰ TimeKeeping
                </h1>
                <p className="text-primary-300 text-xs mt-1">Consulting Time Manager</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary-700 text-white'
                                    : 'text-primary-200 hover:bg-primary-800 hover:text-white',
                            )
                        }
                    >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User info */}
            <div className="px-4 py-4 border-t border-primary-700">
                <p className="text-primary-200 text-xs">Logged in as</p>
                <p className="text-white text-sm font-medium truncate">
                    {user?.firstName} {user?.lastName}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary-700 text-primary-200">
                    {user?.role}
                </span>
            </div>
        </aside>
    );
}
