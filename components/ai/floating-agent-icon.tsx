import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FloatingAgentIconProps {
  themeColorHex?: string;
  onClick?: () => void;
  hasNotifications?: boolean;
}

export function FloatingAgentIcon({ themeColorHex, onClick, hasNotifications = false }: FloatingAgentIconProps) {
  // Estado para controlar qual das 3 imagens está ativa
  const [frame, setFrame] = useState<0 | 1 | 2>(0);
  const [isHovered, setIsHovered] = useState(false);

  // Lógica para o robô piscar de tempo em tempo sozinho
  useEffect(() => {
    if (isHovered) return; // Se o mouse estiver em cima, pausamos a animação automática

    const interval = setInterval(() => {
      // Sorteia se vai piscar (frame 1) ou sorrir (frame 2)
      const randomAction = Math.random() > 0.5 ? 1 : 2;
      setFrame(randomAction);
      
      // Volta para o estado normal (frame 0) após 500ms
      setTimeout(() => setFrame(0), 500);
    }, 5000); // Executa a cada 5 segundos

    return () => clearInterval(interval);
  }, [isHovered]);

  // Imagens do robô na pasta public
  const images = {
    0: '/assets/agent/robot-normal.webp', // Rosto normal
    1: '/assets/agent/robot-winking.webp', // Piscando um olho
    2: '/assets/agent/robot-smiling.webp'  // Sorrindo (olhos fechados)
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onClick}
        onMouseEnter={() => {
          setIsHovered(true);
          setFrame(1); // Pisca o olho imediatamente ao passar o mouse!
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setFrame(0); // Volta ao normal ao tirar o mouse
        }}
        className={cn(
          "relative w-16 h-16 rounded-full focus:outline-none focus:ring-4 focus:ring-primary/50 transition-transform duration-300",
          // Efeito flutuante (sobe e desce suavemente usando tailwind animate)
          "animate-bounce",
          "hover:scale-110" 
        )}
      >
        <img
          src={images[frame]}
          alt="Agente Pessoal IA"
          className="w-full h-full object-contain drop-shadow-xl"
          style={{
            // Opcional: injetar dinamicamente via JS se a cor for alterável
            // filter: `hue-rotate(180deg)`
          }}
        />
        
        {/* Alerta de notificação ou contexto */}
        {hasNotifications && (
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        )}
      </button>
    </div>
  );
}
