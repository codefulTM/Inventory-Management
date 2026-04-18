import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, BarChart3, ClipboardCheck, ShieldCheck, FileText, FileSearch, 
  User, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItemsByRole: Record<string, NavItem[]> = {
  qc: [
    { to: '/qc/dashboard', label: 'Tổng quan chất lượng', icon: BarChart3 },
    { to: '/qc/inbound', label: 'Kiểm soát đầu vào', icon: ClipboardCheck },
    { to: '/qc/inspection', label: 'Kiểm định sản phẩm', icon: ShieldCheck },
    { to: '/qc/traceability', label: 'Truy vết & Báo cáo', icon: FileText },
    { to: '/qc/inventory', label: 'Kiểm soát kho', icon: FileSearch },
  ],
};

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'qc' }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  const navItems = navItemsByRole[role] || navItemsByRole.qc;

  return (
    <aside 
      className={`
        fixed top-0 left-0 z-40 h-screen 
        bg-white border-r border-gray-100 
        flex flex-col
        transition-all duration-300 ease-out
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/25 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="text-lg font-normal text-gray-400 tracking-tight">PHARMA</span>
              <span className="text-lg font-black text-gray-900 tracking-tight">WMS</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[3px] mt-1.5 ml-0.5">
            Warehouse Management System
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                transition-all duration-200 ease-out
                group relative
                ${isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              {!collapsed && <span>{label}</span>}
              
              {/* Active indicator */}
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className={`flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">QC Technician</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">qc_user</p>
              </div>
              <button className="text-gray-400 hover:text-error-500 p-1.5 rounded-lg hover:bg-error-50 transition-colors duration-200">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`
          absolute top-1/2 -translate-y-1/2
          w-6 h-6 bg-white border border-gray-200 rounded-full
          flex items-center justify-center
          text-gray-400 hover:text-gray-600 hover:border-gray-300
          transition-all duration-200
          shadow-sm
          ${collapsed ? 'right-0 translate-x-1/2' : '-right-3'}
        `}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;