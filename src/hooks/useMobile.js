// src/hooks/useMobile.js
import { useState, useEffect } from 'react';

export const useMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Function to check if screen is mobile
    const checkIfMobile = () => {
      const width = window.innerWidth;
      const isMobileViewport = width < breakpoint;
      
      // Also check for touch device
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Consider it mobile if either viewport is small OR it's a touch device with reasonable screen size
      const shouldBeMobile = isMobileViewport || (isTouchDevice && width < 1024);
      
      setIsMobile(shouldBeMobile);
    };

    // Check on mount
    checkIfMobile();

    // Listen for resize events
    window.addEventListener('resize', checkIfMobile);
    
    // Listen for orientation change (mobile devices)
    window.addEventListener('orientationchange', () => {
      // Small delay to let the viewport update
      setTimeout(checkIfMobile, 100);
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('orientationchange', checkIfMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

// Alternative hook for specific breakpoints
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 480) {
        setBreakpoint('mobile-sm');
      } else if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile' || breakpoint === 'mobile-sm',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isMobileOrTablet: breakpoint !== 'desktop'
  };
};