import React, { useState, useEffect } from 'react';

interface AnimatedLogoProps {
  width?: number;
  height?: number;
  className?: string;
  showBackground?: boolean;
}

interface LetterState {
  char: string;
  isVisible: boolean;
  delay: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  width = 200,
  height = 200,
  className = '',
  showBackground = false,
}) => {
  const [animationState, setAnimationState] = useState<'initial' | 'docking' | 'rotating' | 'finishing'>('initial');
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [visibleLetterCount, setVisibleLetterCount] = useState(0);
  const [typingInterval, setTypingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const projectName = "Profitmaker.cc";
  const typingSpeed = 80; // milliseconds per letter

  // Simple typing animation effect
  useEffect(() => {
    // Clear previous interval
    if (typingInterval) {
      clearInterval(typingInterval);
      setTypingInterval(null);
    }

    if (!isTextVisible) {
      setVisibleLetterCount(0);
      return;
    }

    // Start typing animation with interval
    let currentCount = 0;
    const interval = setInterval(() => {
      currentCount++;
      setVisibleLetterCount(currentCount);
      
      if (currentCount >= projectName.length) {
        clearInterval(interval);
        setTypingInterval(null);
      }
    }, typingSpeed);
    
    setTypingInterval(interval);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      setTypingInterval(null);
    };
  }, [isTextVisible, projectName.length, typingSpeed]);

  // Обработка наведения мыши
  const handleMouseEnter = () => {
    if (animationState === 'initial' || animationState === 'finishing') {
      setAnimationState('docking');
      setIsTextVisible(true);
      
      // После стыковки через 600мс запускаем вращение
      setTimeout(() => {
        setAnimationState('rotating');
      }, 600);
    }
  };

  // Обработка ухода мыши
  const handleMouseLeave = () => {
    if (animationState === 'rotating' || animationState === 'docking') {
      setAnimationState('finishing');
      setIsTextVisible(false);
      
      // Через 600мс вернуться в исходное состояние
      setTimeout(() => {
        setAnimationState('initial');
      }, 600);
    }
  };

  // Определяем стили для розового треугольника
  const getPinkTriangleStyles = () => {
    let transform = '';
    let transition = '';
    
    switch (animationState) {
      case 'initial':
        transform = 'translate(0, 0)';
        break;
      case 'docking':
        transform = 'translate(20px, 0)';
        transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        break;
      case 'rotating':
        transform = 'translate(20px, 0)';
        break;
      case 'finishing':
        transform = 'translate(0, 0)';
        transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        break;
    }
    
    return { transform, transition };
  };

  // Определяем стили для зеленого треугольника
  const getGreenTriangleStyles = () => {
    let transform = '';
    let transition = '';
    
    switch (animationState) {
      case 'initial':
        transform = 'translate(0, 0)';
        break;
      case 'docking':
        transform = 'translate(-20px, 0)';
        transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        break;
      case 'rotating':
        transform = 'translate(-20px, 0)';
        break;
      case 'finishing':
        transform = 'translate(0, 0)';
        transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        break;
    }
    
    return { transform, transition };
  };

  // Определяем стили для группы (вращение)
  const getGroupStyles = () => {
    let animation = '';
    let transform = 'rotate(0deg)';
    let transition = '';
    
    switch (animationState) {
      case 'rotating':
        animation = 'spin 4s linear infinite';
        break;
      case 'finishing':
        // При завершении используем плавный переход к нулевому градусу
        transform = 'rotate(0deg)';
        transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        break;
    }
    
    return { animation, transform, transition };
  };

  // Получаем стили для каждого элемента
  const pinkStyles = getPinkTriangleStyles();
  const greenStyles = getGreenTriangleStyles();
  const groupStyles = getGroupStyles();

  return (
    <div 
      className={`${className} cursor-pointer relative`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <style>
          {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          `}
        </style>
        
        {/* Фоновый круг, отображается только во время анимации */}
        {animationState !== 'initial' && (
          <circle 
            cx="100" 
            cy="100" 
            r="100" 
            className="fill-white dark:fill-gray-700"
          />
        )}
        
        {/* Контейнер для анимации */}
        <g 
          id="compass" 
          style={{ 
            transformOrigin: 'center',
            transform: groupStyles.transform,
            transition: groupStyles.transition,
            animation: groupStyles.animation
          }}
        >
          {/* Розовый треугольник (вниз) */}
          <polygon 
            id="pink-triangle" 
            points="65,125 95,75 35,75" 
            fill="#ff9aab" 
            style={{
              transformOrigin: '65px 105px',
              transform: pinkStyles.transform,
              transition: pinkStyles.transition
            }}
          />
          
          {/* Зеленый треугольник (вверх) */}
          <polygon 
            id="green-triangle" 
            points="135,75 105,125 165,125" 
            fill="#98ffa0" 
            style={{
              transformOrigin: '135px 105px',
              transform: greenStyles.transform,
              transition: greenStyles.transition
            }}
          />
        </g>
      </svg>
      
      {/* Анимированный текст */}
      <div 
        className={`absolute left-full top-1/2 transform -translate-y-1/2 ml-3 font-semibold text-lg whitespace-nowrap transition-all duration-300 px-2 py-1 rounded shadow-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${
          isTextVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-20px] pointer-events-none'
        }`}
        style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          letterSpacing: '0.5px',
          zIndex: 1000
        }}
      >
        {projectName.split('').map((char, index) => (
          <span
            key={index}
            className={`inline-block transition-all duration-200 ${
              index < visibleLetterCount 
                ? 'transform scale-100' 
                : 'opacity-0 transform scale-75'
            }`}
            style={{
              color: char === '.' ? '#ff9aab' : 'inherit'
            }}
          >
            {char}
          </span>
        ))}

      </div>
    </div>
  );
}; 