export const triggerHapticFeedback = () => {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
  }
};