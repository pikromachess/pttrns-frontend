import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavBarContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavBarProviderProps {
  children: ReactNode;
}

const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

export function NavBarProvider({ children }: NavBarProviderProps) { 
  const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => {
    return location.pathname === '/' ? 'home' : 
           location.pathname === '/library' ? 'library' : 'home';
  });

  useEffect(() => {
    const newTab = location.pathname === '/' ? 'home' : location.pathname === '/library' ? 'library' : 'home';
    
      setActiveTab(newTab); 
    
  }, [location.pathname]);

  return (
    <NavBarContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavBarContext.Provider>
  );
}

export function useNavBar() {
  const context = useContext(NavBarContext);
  if (!context) {
    throw new Error('useNavBar must be used within a NavBarProvider');
  }
  return context;
}