declare global {
  interface Window {
    Telegram: Telegram
  }
}

export interface Telegram {
  WebApp: WebApp
}