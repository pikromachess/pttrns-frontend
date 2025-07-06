import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import Library from './components/Library/Library';
import CollectionPage from './components/CollectionPage/CollectionPage';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { NavBarProvider } from './contexts/NavBarContext.tsx';
import { PlayerProvider } from './contexts/PlayerContext';
import { SessionProvider } from './contexts/SessionContext';
import { MiniPlayer } from './components/MiniPlayer/MiniPlayer.tsx';
import { NFTProvider } from './contexts/NFTContext';
import { BackendTokenContext } from './BackendTokenContext';
import { ProvideBackendAuth } from './ProvideBackendAuth';
import { TelegramBackButton } from './components/TelegramBackButton/TelegramBackButton';

// Компонент для анимированных роутов
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<App />} />
      <Route path="/library" element={<Library />} />
      <Route path="/collection/:address" element={<CollectionPage />} />
    </Routes>
  );
}

function Root() {
  const [token, setToken] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const preventSelection = (e: TouchEvent) => {
      if (e.type === 'touchstart' && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('touchstart', preventSelection);
    document.addEventListener('selectstart', preventContextMenu);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('touchstart', preventSelection);
      document.removeEventListener('selectstart', preventContextMenu);
    };
  }, []);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      
      tg.expand();
      tg.ready();
      tg.MainButton.hide();
      
      // Инициализируем BackButton
      if (tg.BackButton) {
        tg.BackButton.hide(); // Изначально скрыта
      }
      
      
      // Проверяем поддержку функций перед их вызовом
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }      
      
      if (tg.disableClosingConfirmation) {
        tg.disableClosingConfirmation();        
      }

      const updateSafeArea = () => {
        const insets = tg.contentSafeAreaInset || { top: 0, left: 0, right: 0, bottom: 0 };
        
        document.documentElement.style.setProperty('--safe-area-top', `${insets.top}px`);
        document.documentElement.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
        document.documentElement.style.setProperty('--safe-area-left', `${insets.left}px`);
        document.documentElement.style.setProperty('--safe-area-right', `${insets.right}px`);
      };
      
      updateSafeArea();
      
      if (tg.onEvent) {
        tg.onEvent('viewportChanged', updateSafeArea);
      }

      if (tg.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary_bg-color', tg.themeParams.secondary_bg_color || '#808080');
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#0088cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
      }
      
      return () => {
        if (tg.offEvent) {
          tg.offEvent('viewportChanged', updateSafeArea);
        }
        // Очищаем BackButton при размонтировании
        if (tg.BackButton) {
          tg.BackButton.hide();
        }
      };
    } else {
      document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
      document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
      document.documentElement.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
      document.documentElement.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');
    }
  }, []);

  return (
    <TonConnectUIProvider manifestUrl="https://pikromachess-pttrns-frontend-dc0f.twc1.net/tonconnect-manifest.json">
      <BackendTokenContext.Provider value={{ token, setToken }}>
        <ProvideBackendAuth />
        <SessionProvider>
          <PlayerProvider>
            <NFTProvider>
              <BrowserRouter>
                <NavBarProvider>
                  <TelegramBackButton>
                    <AnimatedRoutes />
                    <MiniPlayer />
                  </TelegramBackButton>
                </NavBarProvider>
              </BrowserRouter>
            </NFTProvider>
          </PlayerProvider>
        </SessionProvider>
      </BackendTokenContext.Provider>
    </TonConnectUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);