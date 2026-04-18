import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Search, User } from 'lucide-react';
import { AuthService } from '../services/auth.service';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

  const handleLogout = async () => {
    const refresh_token = localStorage.getItem('refresh_token');
    console.log('[Header] Logging out with refresh_token:', refresh_token ? 'YES' : 'NO');
    if (refresh_token) {
      try {
        const result = await AuthService.logout(refresh_token);
        console.log('[Header] Logout API response:', result);
      } catch (err) {
        console.error('[Header] Logout API error:', err);
      }
    } else {
      console.warn('[Header] No refresh_token found');
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/auth/login');
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      manager: 'Quản lý',
      operator: 'Nhân viên kho',
      'quality-control': 'QC Technician',
      it_admin: 'IT Administrator',
    };
    return roleMap[role] || role;
  };

  return (
    <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Inventory Management</h1>
      </div>
      
      <nav className="flex items-center gap-4">
        {/* Search (hidden for now) */}
        <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200">
          <Search className="w-5 h-5" />
        </button>
        
        {/* Notifications */}
        <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
        </button>
        
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-slate-400">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;