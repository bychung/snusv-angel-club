'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    BlynxLabWidget?: {
      init: (config: { slug: string }) => void;
    };
  }
}

interface BlynxLabChatWidgetProps {
  slug: string;
  excludePaths?: string[];
  includePaths?: string[];
}

const BlynxLabChatWidget = (props: BlynxLabChatWidgetProps) => {
  const { slug, excludePaths, includePaths } = props;
  const pathname = usePathname();

  useEffect(() => {
    console.log('BlynxLabChatWidget useEffect', pathname);
    const cleanupWidget = () => {
      const existingWidgets = document.querySelectorAll(
        '.blynx-widget-container'
      );
      existingWidgets.forEach(widget => widget.remove());
    };

    console.log('BlynxLabChatWidget pathname', pathname);
    console.log('BlynxLabChatWidget excludePaths', excludePaths);
    console.log('BlynxLabChatWidget includePaths', includePaths);
    if (
      (!excludePaths || !excludePaths?.includes(pathname)) &&
      (!includePaths || includePaths?.includes(pathname))
    ) {
      const initializeWidget = () => {
        cleanupWidget();

        const script = document.createElement('script');
        script.src = 'https://blynxlab.com/widget.js';
        script.onload = function () {
          if (window.BlynxLabWidget) {
            window.BlynxLabWidget.init({ slug });
          }
        };
        document.head.appendChild(script);
      };
      console.log('BlynxLabChatWidget initializeWidget');

      initializeWidget();
    } else {
      console.log('BlynxLabChatWidget clean up');
      cleanupWidget();
    }

    return () => {
      console.log('BlynxLabChatWidget unmount clean up');
      cleanupWidget();
    };
  }, [pathname]);

  return null;
};

export default BlynxLabChatWidget;
