import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

const glowColorMap: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f97316'
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

const GlowCard: React.FC<GlowCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'blue',
  size = 'md'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const distance = Math.sqrt(
        Math.pow(x - rect.width / 2, 2) + 
        Math.pow(y - rect.height / 2, 2)
      );
      
      const maxDistance = Math.sqrt(
        Math.pow(rect.width / 2, 2) + 
        Math.pow(rect.height / 2, 2)
      );
      
      const intensity = Math.max(0, 1 - distance / maxDistance);
      const selectedGlowColor = glowColorMap[glowColor];
      
      card.style.boxShadow = `
        0 0 20px rgba(0, 0, 0, 0.5),
        0 0 40px ${selectedGlowColor}${Math.floor(intensity * 255).toString(16).padStart(2, '0')},
        inset 0 0 20px ${selectedGlowColor}${Math.floor(intensity * 100).toString(16).padStart(2, '0')}
      `;
    };

    const handleMouseLeave = () => {
      card.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [glowColor]);

  return (
    <div
      ref={cardRef}
      className={`
        ${sizeMap[size]}
        rounded-2xl 
        relative 
        border border-gray-700
        bg-gray-900/50
        backdrop-blur-xl
        overflow-hidden
        transition-all duration-300
        ${className}
      `}
      style={{
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-transparent pointer-events-none" />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
};

export { GlowCard }
