import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import icon from './assets/icon.png';
import './App.css';
import { TonConnectButton } from '@tonconnect/ui-react';
import { HomeIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useNavBar } from './contexts/NavBarContext';

function NavBar() {
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

function App() {
  const [count, setCount] = useState(0);
  
  const isTelegram = !!(window.Telegram && window.Telegram.WebApp);
  const telegramAvatar = isTelegram && window.Telegram.WebApp.initDataUnsafe?.user?.photo_url;

  return (
    
      <div className="app">
        <div className="upper-bar">
          <div className="tonConnectButton">
            <TonConnectButton style={{boxShadow: 'none'}} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 'calc(var(--safe-area-top) + 12px)',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',            
              zIndex: 15,
            }}
          >
            <img
              src={icon}
              alt="App Icon"
              style={{
                width: '36px',
                height: '36px',
                objectFit: 'contain',
              }}
            />
            
            {isTelegram && telegramAvatar && (
              <>
                <p> loves </p>
                <img
                  src={telegramAvatar}
                  alt="Telegram Avatar"
                  style={{
                    width: '24px',
                    height: '24px',
                    objectFit: 'cover',
                    borderRadius: '50%', 
                    marginLeft: '6px',           
                  }}
                />
              </>
            )}
          </div>
        </div>
        <div className="main-content">
          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React</h1>
          <div className="card">
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </div>
        <NavBar />
      </div>
    
  );
}

export default App;