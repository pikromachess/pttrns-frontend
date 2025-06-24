import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useNavBar } from '../../contexts/NavBarContext';

export function NavBar() {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useNavBar();

  const handleNavigation = (path: string, tab: string) => {
    setActiveTab(tab);
    navigate(path);
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  return (
    <div className="nav-bar">
      <motion.button 
        className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => handleNavigation('/', 'home')} 
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        <HomeIcon className="nav-icon" />
        Главная
      </motion.button>
      
      <motion.button 
        className={`nav-button ${activeTab === 'library' ? 'active' : ''}`}
        onClick={() => handleNavigation('/library', 'library')} 
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        <ArchiveBoxIcon className="nav-icon" />
        NFT
      </motion.button>
    </div>
  );
}