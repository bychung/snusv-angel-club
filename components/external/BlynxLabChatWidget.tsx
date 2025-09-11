'use client';

import Script from 'next/script';

// TypeScript를 사용하는 경우, BlynxLabWidget 객체가 window에 존재한다고 알려줍니다.
// JavaScript만 사용한다면 이 부분은 생략해도 됩니다.
declare global {
  interface Window {
    BlynxLabWidget?: {
      init: (config: { slug: string }) => void;
    };
  }
}

const BlynxLabChatWidget = (props: { slug: string }) => {
  const { slug } = props;

  return (
    <Script
      id="blynxlab-widget-script"
      src="https://blynxlab.com/widget.js"
      strategy="afterInteractive"
      onLoad={() => {
        // 스크립트 로드가 완료된 후 init 함수를 실행합니다.
        // window 객체에 BlynxLabWidget이 확실히 존재하는지 확인하는 것이 안전합니다.
        if (window.BlynxLabWidget && typeof window.BlynxLabWidget.init === 'function') {
          window.BlynxLabWidget.init({ slug });
        }
      }}
    />
  );
};

export default BlynxLabChatWidget;
