import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

interface SessionContextType {
  hasActiveSession: boolean;
  sessionId: string | null;
  musicServerUrl: string | null;
  expiresAt: Date | null;
  setSessionData: (sessionId: string, musicServerUrl: string, expiresAt: Date) => void;
  clearSession: () => void;
  checkSessionValidity: () => boolean;
}

interface SessionProviderProps {
  children: ReactNode;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Глобальный кеш сессии (вынесен из хука)
let globalSessionCache: {
  sessionId: string;
  expiresAt: Date;
  musicServerUrl: string;
} | null = null;

export function SessionProvider({ children }: SessionProviderProps) {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [musicServerUrl, setMusicServerUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Проверка валидности сессии
  const checkSessionValidity = useCallback((): boolean => {
    if (!globalSessionCache) {
      setHasActiveSession(false);
      setSessionId(null);
      setMusicServerUrl(null);
      setExpiresAt(null);
      return false;
    }
    
    const now = new Date();
    const isValid = now < globalSessionCache.expiresAt;
    
    if (!isValid) {
      // Сессия истекла, очищаем
      globalSessionCache = null;
      setHasActiveSession(false);
      setSessionId(null);
      setMusicServerUrl(null);
      setExpiresAt(null);
      console.log('🕐 Сессия истекла и была очищена');
      return false;
    }
    
    // Обновляем состояние если нужно
    if (!hasActiveSession) {
      setHasActiveSession(true);
      setSessionId(globalSessionCache.sessionId);
      setMusicServerUrl(globalSessionCache.musicServerUrl);
      setExpiresAt(globalSessionCache.expiresAt);
    }
    
    return true;
  }, [hasActiveSession]);

  // Установка данных сессии
  const setSessionData = useCallback((sessionId: string, musicServerUrl: string, expiresAt: Date) => {
    globalSessionCache = {
      sessionId,
      musicServerUrl,
      expiresAt
    };
    
    setHasActiveSession(true);
    setSessionId(sessionId);
    setMusicServerUrl(musicServerUrl);
    setExpiresAt(expiresAt);
    
    console.log('✅ Сессия установлена в глобальный контекст:', {
      sessionId: sessionId.slice(0, 20) + '...',
      expiresAt: expiresAt.toISOString()
    });
  }, []);

  // Очистка сессии
  const clearSession = useCallback(() => {
    globalSessionCache = null;
    setHasActiveSession(false);
    setSessionId(null);
    setMusicServerUrl(null);
    setExpiresAt(null);
    console.log('🗑️ Сессия очищена из глобального контекста');
  }, []);

  // Проверяем сессию при инициализации
  useEffect(() => {
    checkSessionValidity();
  }, [checkSessionValidity]);

  // Периодическая проверка валидности сессии (каждые 30 секунд)
  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionValidity();
    }, 30000); // 30 секунд

    return () => clearInterval(interval);
  }, [checkSessionValidity]);

  // Инициализируем состояние из глобального кеша при монтировании
  useEffect(() => {
    if (globalSessionCache && new Date() < globalSessionCache.expiresAt) {
      setHasActiveSession(true);
      setSessionId(globalSessionCache.sessionId);
      setMusicServerUrl(globalSessionCache.musicServerUrl);
      setExpiresAt(globalSessionCache.expiresAt);
    }
  }, []);

  const value: SessionContextType = {
    hasActiveSession,
    sessionId,
    musicServerUrl,
    expiresAt,
    setSessionData,
    clearSession,
    checkSessionValidity
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

// Функция для получения глобального кеша (для совместимости с существующим кодом)
export const getGlobalSessionCache = () => globalSessionCache;

// Функция для установки глобального кеша (для совместимости с существующим кодом)
export const setGlobalSessionCache = (cache: {
  sessionId: string;
  expiresAt: Date;
  musicServerUrl: string;
} | null) => {
  globalSessionCache = cache;
};