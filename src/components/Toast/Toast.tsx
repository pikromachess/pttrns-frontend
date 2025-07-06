import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  isVisible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ isVisible, message, type = 'success', onClose }: ToastProps) {
  const getToastColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'info':
        return '#2AABEE';
      default:
        return '#4CAF50';
    }
  };

  const getToastIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '✅';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: 'calc(var(--safe-area-top) + 120px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1c1c1c',
            border: `2px solid ${getToastColor()}`,
            borderRadius: '12px',
            padding: '12px 16px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '300px',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
          }}
          onClick={onClose}
        >
          <span style={{ fontSize: '16px' }}>
            {getToastIcon()}
          </span>
          <span style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            flex: 1
          }}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Хук для использования Toast
import { useState, useCallback } from 'react';

export function useToast() {
  const [toastData, setToastData] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) => {
    setToastData({
      isVisible: true,
      message,
      type
    });

    // Автоматически скрываем через duration миллисекунд
    setTimeout(() => {
      setToastData(prev => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToastData(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    toastData,
    showToast,
    hideToast
  };
}