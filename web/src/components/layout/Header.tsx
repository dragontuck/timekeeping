import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        toast.success('Signed out');
        navigate('/login');
    };

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <div />
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                    {user?.firstName} {user?.lastName}
                </span>
                <button
                    onClick={() => void handleLogout()}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                    Sign out
                </button>
            </div>
        </header>
    );
}
