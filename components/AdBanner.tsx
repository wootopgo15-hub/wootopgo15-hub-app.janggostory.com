
import React, { useEffect } from 'react';

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
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // @ts-ignore
        const adsbygoogle = window.adsbygoogle || [];
        // Only push if there's an unprocessed ins element
        const unprocessedAds = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
        if (unprocessedAds.length > 0) {
          adsbygoogle.push({});
        }
      } catch (e) {
        // Silent error for "All ins elements already have ads" as it's common in SPAs
        if (e instanceof Error && !e.message.includes('already have ads')) {
          console.error("AdSense error:", e);
        }
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [slot]); // Re-run if slot changes

  return (
    <div className={`ad-container my-4 overflow-hidden rounded-xl bg-gray-50/50 flex items-center justify-center min-h-[100px] border border-dashed border-gray-200 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
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
