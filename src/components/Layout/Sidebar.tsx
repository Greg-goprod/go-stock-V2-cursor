import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CalendarClock, 
  Bell, 
  Settings, 
  Menu, 
  X,
  QrCode
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

const Sidebar: React.FC = () => {
  const { notifications } = useApp();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('');
  
  const unreadNotifications = notifications.filter(notif => !notif.read).length;

  useEffect(() => {
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'company_logo')
        .maybeSingle();

      if (data?.value) {
        setCompanyLogo(data.value);
      }
    } catch (error) {
      // Logo not found, use default
      console.log('No company logo found');
    }
  };
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm tracking-wide ${
      isActive 
        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 font-bold' 
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
    }`;

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
        onClick={toggleSidebar}
      >
        {isOpen ? <X size={20} className="dark:text-white" /> : <Menu size={20} className="dark:text-white" />}
      </button>
      
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-md z-40 transition-transform transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center gap-3">
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Logo de l'entreprise"
                className="max-h-12 max-w-48 object-contain"
              />
            )}
            <div className="flex items-center gap-2 font-black text-primary-700 dark:text-primary-300 text-2xl tracking-tight">
              <QrCode size={28} />
              <span>GO-Mat</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-light tracking-wide uppercase">
              Gestion de Matériel
            </p>
          </div>
        </div>
        
        <nav className="py-4 px-2 flex flex-col gap-1">
          <NavLink to="/" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <LayoutDashboard size={20} />
            <span className="uppercase tracking-wider font-bold">TABLEAU DE BORD</span>
          </NavLink>
          
          <NavLink to="/equipment" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <Package size={20} />
            <span className="uppercase tracking-wider font-bold">MATÉRIEL</span>
          </NavLink>
          
          <NavLink to="/users" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <Users size={20} />
            <span className="uppercase tracking-wider font-bold">UTILISATEURS</span>
          </NavLink>
          
          <NavLink to="/checkouts" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <CalendarClock size={20} />
            <span className="uppercase tracking-wider font-bold">SORTIE MATÉRIEL</span>
          </NavLink>
          
          <NavLink to="/notifications" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <div className="relative">
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadNotifications}
                </span>
              )}
            </div>
            <span className="uppercase tracking-wider font-bold">NOTIFICATIONS</span>
          </NavLink>
          
          <NavLink to="/settings" className={navLinkClass} onClick={() => setIsOpen(false)}>
            <Settings size={20} />
            <span className="uppercase tracking-wider font-bold">PARAMÈTRES</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;