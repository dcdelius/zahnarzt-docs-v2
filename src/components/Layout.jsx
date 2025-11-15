import { Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import TopNavigation from './TopNavigation';
import { useUser } from '../contexts/UserContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { users, selectedUser, setSelectedUser } = useUser();
  
  // TopNavigation nur auf bestimmten Seiten anzeigen (nicht auf Login)
  const showNavigation = location.pathname !== '/' && location.pathname !== '/landing';
  
  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigate('/');
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
  };
  
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Gradient Background - Bleibt statisch */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b]" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
      </div>
      
      {/* TopNavigation - Bleibt statisch bei Navigation */}
      {showNavigation && (
        <TopNavigation 
          users={users}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          onLogout={handleLogout}
        />
      )}
      
      {/* Content-Bereich - Wird animiert */}
      <div className="flex-1 relative overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
} 