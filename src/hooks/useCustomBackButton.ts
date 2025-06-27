import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseCustomBackButtonProps {
  onBack?: () => void;
  customPath?: string;
  enabled?: boolean;
}

export function useCustomBackButton({ 
  onBack, 
  customPath, 
  enabled = true 
}: UseCustomBackButtonProps = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || !window.Telegram?.WebApp) return;

    const tg = window.Telegram.WebApp;
    const backButton = tg.BackButton;

    const handleCustomBack = () => {      
      
      // Тактильная обратная связь
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      }

      if (onBack) {
        onBack();
      } else if (customPath) {
        navigate(customPath);
      } else {
        navigate(-1);
      }
    };

    // Показываем кнопку и добавляем обработчик
    backButton.show();
    backButton.onClick(handleCustomBack);

    return () => {
      backButton.offClick(handleCustomBack);
    };
  }, [onBack, customPath, enabled, navigate]);
}
