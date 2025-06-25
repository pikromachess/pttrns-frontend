import { useTelegramBackButton } from '../../hooks/useTelegramBackButton';

interface TelegramBackButtonProps {
  children: React.ReactNode;
}

export function TelegramBackButton({ children }: TelegramBackButtonProps) {
  useTelegramBackButton();
  return <>{children}</>;
}

