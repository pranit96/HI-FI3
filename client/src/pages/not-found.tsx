import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, opacity: number}>>([]);
  
  useEffect(() => {
    // Create floating particles for background effect
    const particleCount = 20;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 2,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animation: `floating ${5 + Math.random() * 5}s ease-in-out infinite`
          }}
        />
      ))}
      
      <Card 
        className="w-full max-w-md mx-4 border shadow-lg relative z-10 overflow-hidden"
        style={{ animation: "pulse 3s ease-in-out infinite" }}
      >
        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle 
              className="h-10 w-10 text-destructive" 
              style={{ animation: "pulse 2s ease-in-out infinite" }}
            />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="mt-4 mb-6 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
