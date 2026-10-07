import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FloatingAgentIconProps {
  themeColorHex?: string;
  onClick?: () => void;
  hasNotifications?: boolean;
  className?: string;
  title?: string;
  pathname?: string;
}

export function FloatingAgentIcon({
  themeColorHex = '#3B82F6',
  onClick,
  hasNotifications = false,
  className,
  title = "Conversar com o Agente IA",
  pathname,
}: FloatingAgentIconProps) {
  // Estado para controlar qual das 3 expressões está ativa
  const [frame, setFrame] = useState<0 | 1 | 2>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // 1. Pular quando a tela/rota mudar
  useEffect(() => {
    if (!pathname) return;
    setIsBouncing(true);
    setFrame(2); // Sorri ao entrar em nova tela
    const timer = setTimeout(() => {
      setIsBouncing(false);
      setFrame(0);
    }, 1500);
    return () => clearTimeout(timer);
  }, [pathname]);

  // 2. Pular de tempo em tempo (a cada 30 segundos)
  useEffect(() => {
    const bounceInterval = setInterval(() => {
      if (document.hidden) return; // Não pular se a aba estiver em segundo plano
      setIsBouncing(true);
      // Pisca ou sorri durante o salto
      setFrame(Math.random() > 0.5 ? 1 : 2);
      setTimeout(() => {
        setIsBouncing(false);
        setFrame(0);
      }, 1500);
    }, 30000); // Exatamente a cada 30 segundos

    return () => clearInterval(bounceInterval);
  }, []);

  // 3. Piscar os olhos sutilmente de tempo em tempo quando ocioso (a cada 8 segundos)
  useEffect(() => {
    if (isHovered || isBouncing) return;

    const eyeInterval = setInterval(() => {
      if (document.hidden) return;
      const randomAction = Math.random() > 0.6 ? 1 : 2;
      setFrame(randomAction);
      setTimeout(() => setFrame(0), 400);
    }, 8000);

    return () => clearInterval(eyeInterval);
  }, [isHovered, isBouncing]);

  // Imagens do robô com cache-busting v=3 para garantir alpha transparente em todos os navegadores
  const images = {
    0: '/assets/agent/robot-normal.webp?v=3',
    1: '/assets/agent/robot-winking.webp?v=3',
    2: '/assets/agent/robot-smiling.webp?v=3',
  };

  return (
    <div className={cn("fixed bottom-22 right-5 z-40 select-none", className)}>
      <button
        onClick={onClick}
        title={title}
        aria-label={title}
        onMouseEnter={() => {
          setIsHovered(true);
          setFrame(1); // Pisca o olho imediatamente ao passar o mouse
          setIsBouncing(true);
          setTimeout(() => setIsBouncing(false), 1200);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setFrame(0);
        }}
        className={cn(
          "group relative w-16 h-16 rounded-full focus:outline-none focus:ring-4 focus:ring-primary/40 transition-all duration-300",
          "hover:scale-110 active:scale-95 shadow-xl hover:shadow-2xl cursor-pointer",
          // Pula apenas quando o gatilho estiver ativo (a cada 30s, hover ou troca de rota)
          isBouncing && "animate-bounce"
        )}
      >
        {/* Halo de brilho sutil ao redor do robô */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity"
          style={{ backgroundColor: themeColorHex }}
        />

        {/* Recipiente estritamente circular com fundo transparente e borda elegante */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-transparent border-2 border-primary/30 flex items-center justify-center backdrop-blur-xs">
          <img
            src={images[frame]}
            alt="Agente Pessoal IA"
            className="w-full h-full object-contain drop-shadow-md select-none pointer-events-none"
          />
        </div>

        {/* Alerta de notificação ou contexto */}
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background"></span>
          </span>
        )}
      </button>
    </div>
  );
}
