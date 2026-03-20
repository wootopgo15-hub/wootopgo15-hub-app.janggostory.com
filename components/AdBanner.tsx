
import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  client?: string;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: 'true' | 'false';
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ 
  client = "ca-app-pub-7204177319630647", 
  slot = "567733952", 
  format = "auto", 
  responsive = "true",
  className = ""
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let pushed = false;
    let observer: ResizeObserver | null = null;

    const pushAd = () => {
      if (pushed) return;
      
      const insElement = adRef.current;
      if (!insElement) return;
      
      // Check if the element or its parent has a width > 0
      const width = insElement.clientWidth || (insElement.parentElement?.clientWidth || 0);
      
      if (width > 0) {
        try {
          // @ts-ignore
          const adsbygoogle = window.adsbygoogle || [];
          adsbygoogle.push({});
          pushed = true;
          if (observer) {
            observer.disconnect();
          }
        } catch (e) {
          if (e instanceof Error && !e.message.includes('already have ads')) {
            console.error("AdSense error:\n" + e.message);
          }
        }
      }
    };

    // Try to push immediately (with a small delay for DOM to settle)
    const timer = setTimeout(() => {
      pushAd();
      
      // If still not pushed (width was 0), observe for resize
      if (!pushed && adRef.current?.parentElement) {
        observer = new ResizeObserver(() => {
          pushAd();
        });
        observer.observe(adRef.current.parentElement);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [slot, client, format, responsive]);

  return (
    <div className={`ad-container relative my-4 overflow-hidden rounded-xl bg-gray-50/50 flex items-center justify-center min-h-[100px] border border-dashed border-gray-200 ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: '250px' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
      {/* Placeholder text for dev/preview if ad doesn't load */}
      <div className="absolute text-[10px] text-gray-300 font-bold pointer-events-none uppercase tracking-widest">
        Advertisement
      </div>
    </div>
  );
};

export default AdBanner;
