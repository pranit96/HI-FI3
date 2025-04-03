import { ReactNode, useState, useEffect } from 'react';
import { Link } from 'wouter';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  linkText: string;
  linkHref: string;
};

const AuthLayout = ({ 
  children, 
  title, 
  subtitle, 
  linkText, 
  linkHref 
}: AuthLayoutProps) => {
  const [particles, setParticles] = useState<Array<{ 
    id: number; 
    x: number; 
    y: number; 
    size: number; 
    velocity: number;
    opacity: number;
    color: string;
  }>>([]);
  
  // Generate particles for background animation
  useEffect(() => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
    const particleCount = window.innerWidth < 768 ? 25 : 40;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        velocity: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles(newParticles);
    
    const animationInterval = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          y: particle.y <= 100 ? particle.y + particle.velocity : -5,
          x: particle.x + (Math.random() * 0.2 - 0.1)
        }))
      );
    }, 50);
    
    return () => clearInterval(animationInterval);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left column - Form */}
      <div className="md:w-1/2 flex flex-col justify-center p-8 md:p-12 space-y-6 relative z-10">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          
          {children}
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{linkText.split(' ')[0]} </span>
            <Link href={linkHref} className="text-primary font-medium hover:underline">
              {linkText.split(' ').slice(1).join(' ')}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Right column - Decoration and particles */}
      <div className="md:w-1/2 bg-gradient-to-br from-primary/5 to-secondary/10 hidden md:block relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        
        {/* Animated particles */}
        <div className="absolute inset-0">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                opacity: particle.opacity,
                transition: 'top 0.5s linear, left 0.5s ease-in-out',
              }}
            />
          ))}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="p-8 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl max-w-md">
            <h2 className="text-2xl font-bold mb-4">Smart Finance Management</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="rounded-full bg-primary/20 p-1 mr-3 mt-0.5">
                  <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm">AI-powered insights from your banking data</p>
              </li>
              <li className="flex items-start">
                <div className="rounded-full bg-primary/20 p-1 mr-3 mt-0.5">
                  <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm">Set and track financial goals for your future</p>
              </li>
              <li className="flex items-start">
                <div className="rounded-full bg-primary/20 p-1 mr-3 mt-0.5">
                  <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm">Receive personalized saving recommendations</p>
              </li>
              <li className="flex items-start">
                <div className="rounded-full bg-primary/20 p-1 mr-3 mt-0.5">
                  <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm">Customizable email notifications and alerts</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;