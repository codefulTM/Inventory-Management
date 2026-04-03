import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

const Header: React.FC = () => {
	const navigate = useNavigate();
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

	const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

	return (
		<header style={{ background: '#1e293b', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<div style={{ fontWeight: 'bold', fontSize: 24 }}>Inventory Management</div>
			<nav>
				{user && (
					<button
						onClick={handleLogout}
						style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
					>
						Đăng xuất
					</button>
				)}
			</nav>
		</header>
	);
};

export default Header;
