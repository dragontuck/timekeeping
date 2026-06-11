import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';
import ClientsPage from './pages/clients/ClientsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import TimeEntriesPage from './pages/time-entries/TimeEntriesPage';
import ReportsPage from './pages/reports/ReportsPage';
import AlertsPage from './pages/alerts/AlertsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/clients" element={<ClientsPage />} />
                                <Route path="/projects" element={<ProjectsPage />} />
                                <Route path="/time-entries" element={<TimeEntriesPage />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/alerts" element={<AlertsPage />} />
                                <Route path="/invoices" element={<InvoicesPage />} />
                                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                                <Route path="/audit-log" element={<AuditLogPage />} />
                            </Route>
                        </Route>
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
