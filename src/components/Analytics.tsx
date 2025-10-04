import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ym?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const YANDEX_METRICA_ID = import.meta.env.VITE_YANDEX_METRICA_ID;

export const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize Google Analytics
    if (GA_MEASUREMENT_ID) {
      // Load GA script
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(gaScript);

      // Initialize GA
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer?.push(args);
      }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll send manually on route changes
      });
    }

    // Initialize Yandex Metrica
    if (YANDEX_METRICA_ID) {
      const ymScript = document.createElement('script');
      ymScript.type = 'text/javascript';
      ymScript.innerHTML = `
        (function(m,e,t,r,i,k,a){
          m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRICA_ID}', 'ym');

        ym(${YANDEX_METRICA_ID}, 'init', {
          ssr:true,
          webvisor:true,
          clickmap:true,
          ecommerce:"dataLayer",
          accurateTrackBounce:true,
          trackLinks:true
        });
      `;
      document.head.appendChild(ymScript);

      // Add noscript fallback
      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${YANDEX_METRICA_ID}" style="position:absolute; left:-9999px;" alt="" /></div>`;
      document.body.appendChild(noscript);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    const page_path = location.pathname + location.search;
    const page_title = document.title;

    // Track in Google Analytics
    if (GA_MEASUREMENT_ID && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path,
        page_title,
      });
    }

    // Track in Yandex Metrica
    if (YANDEX_METRICA_ID && window.ym) {
      window.ym(YANDEX_METRICA_ID, 'hit', page_path, {
        title: page_title,
      });
    }
  }, [location]);

  return null;
};

export default Analytics;
