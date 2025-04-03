import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useEffect } from "react";

// Advanced particle animation system for interactive background
const ParticleSystem = () => {
  useEffect(() => {
    // Create and manage particles
    const createParticles = () => {
      const particleCount = window.innerWidth < 768 ? 15 : 30;
      const particleContainer = document.createElement('div');
      particleContainer.className = 'particle-container';
      particleContainer.style.position = 'fixed';
      particleContainer.style.top = '0';
      particleContainer.style.left = '0';
      particleContainer.style.width = '100%';
      particleContainer.style.height = '100%';
      particleContainer.style.pointerEvents = 'none';
      particleContainer.style.zIndex = '0';
      document.body.appendChild(particleContainer);

      // Create particles
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size between 2-8px
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        
        // Random opacity
        particle.style.opacity = (Math.random() * 0.4 + 0.1).toString();
        
        particleContainer.appendChild(particle);
        
        // Animate particles
        animateParticle(particle);
      }
    };
    
    // Animation function for each particle
    const animateParticle = (particle: HTMLElement) => {
      const moveParticle = () => {
        // Get current position
        const currentLeft = parseFloat(particle.style.left);
        const currentTop = parseFloat(particle.style.top);
        
        // Random direction and distance
        const moveX = (Math.random() - 0.5) * 10;
        const moveY = (Math.random() - 0.5) * 10;
        
        // Calculate new position
        let newLeft = currentLeft + moveX;
        let newTop = currentTop + moveY;
        
        // Keep particles within the viewport
        newLeft = Math.max(0, Math.min(100, newLeft));
        newTop = Math.max(0, Math.min(100, newTop));
        
        // Apply new position with subtle transition
        particle.style.transition = `transform ${Math.random() * 3 + 2}s ease-in-out, opacity 2s ease-in-out`;
        particle.style.left = `${newLeft}%`;
        particle.style.top = `${newTop}%`;
        
        // Random opacity change
        particle.style.opacity = (Math.random() * 0.4 + 0.1).toString();
        
        // Schedule next animation
        setTimeout(moveParticle, Math.random() * 5000 + 3000);
      };
      
      // Start animation
      moveParticle();
    };
    
    // Interactive cursor effect
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      document.documentElement.style.setProperty('--mouse-x', `${mouseX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${mouseY}px`);
      
      // Create ripple effect on mouse move
      const particles = document.querySelectorAll('.particle');
      particles.forEach((particle: Element) => {
        const rect = (particle as HTMLElement).getBoundingClientRect();
        const particleX = rect.left + rect.width / 2;
        const particleY = rect.top + rect.height / 2;
        
        // Calculate distance
        const dx = mouseX - particleX;
        const dy = mouseY - particleY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse is close to particle, make it move away slightly
        if (distance < 100) {
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * (1 - distance / 100) * -20;
          const pushY = Math.sin(angle) * (1 - distance / 100) * -20;
          
          (particle as HTMLElement).style.transform = `translate(${pushX}px, ${pushY}px)`;
        } else {
          (particle as HTMLElement).style.transform = '';
        }
      });
    };
    
    // Initialize the particle system
    createParticles();
    
    // Add mouse movement event listener
    window.addEventListener('mousemove', handleMouseMove);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      const container = document.querySelector('.particle-container');
      if (container) {
        document.body.removeChild(container);
      }
    };
  }, []);
  
  return null;
};

// Application Root with advanced UI elements
const AppRoot = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ParticleSystem />
      <App />
      <Toaster />
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<AppRoot />);
