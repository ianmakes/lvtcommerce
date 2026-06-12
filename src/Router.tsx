/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';

// Custom event-based navigation hook to listen to browser URL changes
export function useLocation() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return path;
}

// Global programmatic navigation helper
export function navigate(to: string) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

// Click-intercepting link component that triggers soft-navigation
export const Link: React.FC<LinkProps> = ({ to, children, onClick, ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Intercept standard clicks (not cmd/ctrl/shift clicks, and only left clicks)
    if (e.button === 0 && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to);
      if (onClick) onClick(e);
    }
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};
