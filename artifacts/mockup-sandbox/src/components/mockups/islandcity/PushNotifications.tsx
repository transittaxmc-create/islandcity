import React from "react";

export function PushNotifications() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505]" style={{ fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}>
      {/* Phone container */}
      <div className="relative w-[390px] h-[844px] bg-black overflow-hidden rounded-[50px] shadow-[0_0_0_12px_#111,0_0_0_14px_#333,0_30px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        
        {/* Wallpaper */}
        <div className="absolute inset-0 bg-[#0a0a0a]">
          <div className="absolute top-[-10%] left-[-20%] w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(246,221,140,0.12)_0%,transparent_70%)] blur-2xl" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[70%] bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.06)_0%,transparent_70%)] blur-2xl" />
          {/* Subtle noise */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
        </div>
        
        {/* Status Bar */}
        <div className="absolute top-0 w-full h-[47px] flex justify-between items-center px-[22px] z-20">
          <span className="text-white text-[15px] font-semibold tracking-wide">9:41</span>
          <div className="flex space-x-1.5 items-center">
            {/* Cellular */}
            <div className="flex space-x-[2px] items-end h-[10px]">
              <div className="w-[3px] h-[4px] bg-white rounded-sm" />
              <div className="w-[3px] h-[6px] bg-white rounded-sm" />
              <div className="w-[3px] h-[8px] bg-white rounded-sm" />
              <div className="w-[3px] h-[10px] bg-white rounded-sm" />
            </div>
            {/* Wi-Fi */}
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 11C8.05228 11 8.5 10.5523 8.5 10C8.5 9.44772 8.05228 9 7.5 9C6.94772 9 6.5 9.44772 6.5 10C6.5 10.5523 6.94772 11 7.5 11Z" fill="white"/>
              <path d="M10.8711 7.22852C11.5303 7.88769 11.5303 8.95654 10.8711 9.61572C10.6865 9.80029 10.458 9.92871 10.2109 10.001C10.0215 10.0557 9.81641 9.94043 9.76172 9.75098C9.70703 9.56152 9.82227 9.35645 10.0117 9.30176C10.1348 9.26562 10.249 9.20117 10.3418 9.1084C10.7422 8.70796 10.7422 8.05757 10.3418 7.65718C9.94141 7.25679 9.29102 7.25679 8.89062 7.65718C8.79785 7.74995 8.68359 7.8144 8.56055 7.85054C8.37109 7.90523 8.16602 7.79 8.11133 7.60054C8.05664 7.41108 8.17188 7.20601 8.36133 7.15132C8.6084 7.07905 8.83691 6.95064 9.02148 6.76606C9.68066 6.10689 10.7495 6.10689 11.4087 6.76606" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M3.77148 4.22852C5.82812 2.17188 9.17188 2.17188 11.2285 4.22852C11.8877 4.88769 11.8877 5.95654 11.2285 6.61572C11.0439 6.80029 10.8154 6.92871 10.5684 7.001C10.3789 7.0557 10.1738 6.94043 10.1191 6.75098C10.0645 6.56152 10.1797 6.35645 10.3691 6.30176C10.4922 6.26562 10.6064 6.20117 10.6992 6.1084C11.1 5.70796 11.1 5.05757 10.6992 4.65718C8.89062 2.84858 5.95703 2.84858 4.14844 4.65718C3.74798 5.05757 3.74798 5.70796 4.14844 6.1084C4.24121 6.20117 4.35547 6.26562 4.47852 6.30176C4.66797 6.35645 4.7832 6.56152 4.72852 6.75098C4.67383 6.94043 4.46875 7.0557 4.2793 7.001C4.03223 6.92871 3.80371 6.80029 3.61914 6.61572C2.95996 5.95654 2.95996 4.88769 3.61914 4.22852Z" fill="white"/>
            </svg>
            {/* Battery */}
            <div className="w-[22px] h-[11px] rounded-[3.5px] border border-white/50 p-[1px] relative flex">
              <div className="bg-white w-[85%] h-full rounded-[1.5px]" />
              <div className="absolute right-[-3px] top-[3px] w-[2px] h-[3px] bg-white/50 rounded-r-[1px]" />
            </div>
          </div>
        </div>

        {/* Lock Icon */}
        <div className="absolute top-[48px] w-full flex justify-center z-20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
            <path d="M12 2C9.243 2 7 4.243 7 7V10H6C4.897 10 4 10.897 4 12V20C4 21.103 4.897 22 6 22H18C19.103 22 20 21.103 20 20V12C20 10.897 19.103 10 18 10H17V7C17 4.243 14.757 2 12 2ZM9 7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V10H9V7ZM18 12L18.002 20H6V12H18Z" fill="currentColor"/>
            <path d="M12 18C13.1046 18 14 17.1046 14 16C14 14.8954 13.1046 14 12 14C10.8954 14 10 14.8954 10 16C10 17.1046 10.8954 18 12 18Z" fill="currentColor"/>
          </svg>
        </div>
        
        {/* Lock Screen Time */}
        <div className="absolute top-[90px] w-full flex flex-col items-center z-10 pointer-events-none">
          <div className="text-white/80 text-[20px] font-medium tracking-wide">
            Martes, 11 de agosto
          </div>
          <div className="text-white text-[96px] font-semibold leading-none tracking-tighter mt-1" style={{ fontFamily: "-apple-system, system-ui, sans-serif" }}>
            9:41
          </div>
        </div>
        
        {/* Notifications list */}
        <div className="absolute bottom-[110px] w-full px-[8px] flex flex-col gap-2 z-20">
          
          <Notification
            app="ISLANDCITY"
            time="Ahora"
            title="Pago mañana"
            message="El pago de Car Payment ($919) vence mañana. Tu saldo proyectado es $2,201."
            dotColor="bg-red-500 text-red-500 shadow-[0_0_8px_currentColor]"
          />

          <Notification
            app="ISLANDCITY"
            time="hace 2h"
            title="Pago en 3 días"
            message="El pago de Car Payment ($919) vence en 3 días. Asegúrate de tener fondos."
            dotColor="bg-yellow-500 text-yellow-500 shadow-[0_0_8px_currentColor]"
          />

          <Notification
            app="ISLANDCITY"
            time="hace 5h"
            title="Pago en 7 días"
            message="El pago de Renta ($1,500) se aproxima en 7 días."
            dotColor="bg-green-500 text-green-500 shadow-[0_0_8px_currentColor]"
          />

        </div>

        {/* Swipe up text */}
        <div className="absolute bottom-[36px] w-full text-center z-20">
          <span className="text-white/50 text-[13px] font-medium tracking-wide">Desliza hacia arriba para abrir</span>
        </div>

        {/* Lock Screen Home Indicator */}
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white rounded-full z-20" />
      </div>
    </div>
  );
}

function Notification({ app, time, title, message, dotColor }: any) {
  return (
    <div className="w-full bg-[rgba(30,30,30,0.6)] backdrop-blur-[24px] rounded-[24px] p-[14px] flex flex-col shadow-2xl border border-white/[0.08] transition-transform active:scale-[0.98]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[6px]">
        <div className="flex items-center gap-[6px]">
          <div className="w-[18px] h-[18px] rounded-[4px] bg-[#141414] border border-[#333] flex items-center justify-center text-[#f6dd8c] text-[10px] font-bold">
            M
          </div>
          <span className="text-white/60 text-[11px] font-medium tracking-wider uppercase">{app}</span>
        </div>
        <span className="text-white/40 text-[11px]">{time}</span>
      </div>
      
      {/* Content */}
      <div className="flex items-start gap-3 mt-1">
        <div className={`mt-[6px] w-[6px] h-[6px] rounded-full flex-shrink-0 ${dotColor}`} />
        <div className="flex flex-col gap-1">
          <span className="text-white text-[15px] font-semibold leading-tight">{title}</span>
          <span className="text-white/70 text-[14px] leading-[1.3]">{message}</span>
        </div>
      </div>
    </div>
  );
}
