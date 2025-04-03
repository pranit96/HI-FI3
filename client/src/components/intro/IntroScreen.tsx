import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const IntroScreen = () => {
  const [active, setActive] = useState(true);
  const [grains, setGrains] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number }>>([]);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Create grain particles
  useEffect(() => {
    const grainCount = window.innerWidth < 768 ? 40 : 80;
    const newGrains = [];
    
    for (let i = 0; i < grainCount; i++) {
      newGrains.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 2,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
    
    setGrains(newGrains);
    
    // Add event listener for particle movement on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      
      setGrains(prev => prev.map(grain => {
        // Calculate distance from mouse
        const dx = grain.x - mouseX;
        const dy = grain.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Move particles away from mouse
        if (distance < 20) {
          const angle = Math.atan2(dy, dx);
          const force = (20 - distance) / 5;
          
          return {
            ...grain,
            x: Math.max(0, Math.min(100, grain.x + Math.cos(angle) * force)),
            y: Math.max(0, Math.min(100, grain.y + Math.sin(angle) * force)),
            opacity: Math.min(0.7, grain.opacity + 0.1)
          };
        }
        
        return grain;
      }));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Handle start journey button
  const handleStartJourney = () => {
    // Display welcome toast
    toast({
      title: "Welcome to FinanceAI!",
      description: "Your journey to financial intelligence starts now.",
      duration: 5000,
    });
    
    setActive(false);
    
    // Redirect to login after animation completes
    setTimeout(() => {
      setLocation('/login');
    }, 1000);
  };

  if (!active) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      style={{ 
        opacity: active ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
      ref={containerRef}
    >
      <div className="grain-overlay"></div>
      
      {/* Animated grain particles */}
      <div className="intro-grains absolute inset-0 overflow-hidden">
        {grains.map(grain => (
          <div
            key={grain.id}
            className="absolute rounded-full"
            style={{
              left: `${grain.x}%`,
              top: `${grain.y}%`,
              width: `${grain.size}px`,
              height: `${grain.size}px`,
              backgroundColor: 'var(--accent)',
              opacity: grain.opacity,
              transition: 'left 0.6s ease, top 0.6s ease, opacity 0.3s ease',
            }}
          />
        ))}
      </div>
      
      {/* Intro content */}
      <div className="relative z-10 text-center max-w-4xl px-6">
        <h1 
          className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          style={{ animation: "floating 4s ease-in-out infinite" }}
        >
          Your Financial Journey <br className="hidden md:block" />Starts Here
        </h1>
        
        <p 
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          style={{ animation: "pulse 3s ease-in-out infinite" }}
        >
          Gain control of your finances with AI-powered tools, personalized insights, and a modern approach to money management.
        </p>
        
        <div style={{ position: "relative" }}>
          <div 
            style={{ 
              position: "absolute", 
              top: "-10px", 
              left: "-10px", 
              right: "-10px", 
              bottom: "-10px",
              borderRadius: "30px",
              background: "radial-gradient(circle at center, var(--primary), transparent 70%)",
              opacity: 0.5,
              filter: "blur(15px)",
              animation: "neuralPulse 8s linear infinite"
            }} 
          />
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleStartJourney}
            className="relative z-10 shadow-lg shadow-primary/20"
            style={{ animation: "pulse 2s ease-in-out infinite" }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;