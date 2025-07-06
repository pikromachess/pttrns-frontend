import { motion, AnimatePresence } from 'framer-motion';

interface SessionWarningModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SessionWarningModal({ isVisible, onConfirm, onCancel }: SessionWarningModalProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1c1c1c',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          {/* Иконка */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#2AABEE',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px'
          }}>
            🔐
          </div>

          {/* Заголовок */}
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '12px'
          }}>
            Начало сессии прослушивания
          </h3>

          {/* Описание */}
          <p style={{
            fontSize: '14px',
            color: '#999',
            lineHeight: '1.5',
            marginBottom: '24px'
          }}>
            Для прослушивания NFT необходимо создать защищенную сессию. 
            Вам потребуется подписать сообщение в кошельке для подтверждения 
            права на прослушивание токенизированного контента.
          </p>

          {/* Дополнительная информация */}
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#ccc',
              margin: 0
            }}>
              ✓ Сессия действует 1 час<br/>
              ✓ Безопасная верификация в блокчейне<br/>
              ✓ Честное использование NFT-аудио
            </p>
          </div>

          {/* Кнопки */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: window.innerWidth < 400 ? 'column' : 'row'
          }}>
            <motion.button
              onClick={onCancel}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Отмена
            </motion.button>
            
            <motion.button
              onClick={onConfirm}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#2AABEE',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Создать сессию
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}