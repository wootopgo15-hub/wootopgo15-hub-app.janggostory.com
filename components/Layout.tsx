
import React, { ReactNode } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  footerText?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, footerText }) => {
  const bgUrl = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1920';

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-cover bg-center overflow-hidden safe-top safe-bottom" 
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      <div className="absolute inset-0 bg-white/60 z-0" />
      
      <div className="relative z-10 w-full max-w-[420px]">
        {children}
        
        {footerText && (
          <div className="mt-6 text-center text-[#4a5568] font-medium text-xs tracking-tight">
            {footerText}
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
