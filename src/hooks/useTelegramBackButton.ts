import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useTelegramBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!window.Telegram?.WebApp) return;

    const tg = window.Telegram.WebApp;
    const backButton = tg.BackButton;

    // Определяем, нужно ли показывать кнопку "Назад"
    const shouldShowBackButton = location.pathname !== '/';

    if (shouldShowBackButton) {
      // Показываем кнопку "Назад"
      backButton.show();
      
      // Обработчик нажатия на кнопку "Назад"
      const handleBackClick = () => {      
        
        // Добавляем тактильную обратную связь
        if (tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('light');
        }
        
        // Навигация назад
        if (window.history.length > 1) {
          navigate(-1); // Возвращаемся на предыдущую страницу
        } else {
          navigate('/'); // Если истории нет, идем на главную
        }
      };

      // Добавляем обработчик
      backButton.onClick(handleBackClick);

      // Функция очистки
      return () => {
        backButton.hide();
        backButton.offClick(handleBackClick);
      };
    } else {
      // Скрываем кнопку на главной странице
      backButton.hide();
    }
  }, [location.pathname, navigate]);
}

