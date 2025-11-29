
import React, { useRef, useEffect, memo } from 'react';
import { Pixupet, getProceduralMonsterArt, ELEMENT_THEMES } from '../services/gameData';
import { makeBackgroundTransparent } from '../utils/html';

export const VoxelViewer = memo(({ code, mode = 'HABITAT', action = 'WALK', envData, equipment, onInteract, onStateChange, preEvent, eventActive }: { code: string, mode?: string, action?: string, envData?: { envType: string, isNight: boolean }, equipment?: any, onInteract?: ()=>void, onStateChange?: (s:string)=>void, preEvent?: string, eventActive?: boolean }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
        if (e.data.type === 'PET_CLICKED_CONFIRM' && onInteract) onInteract(); 
        if ((e.data.type === 'ENTER_IDLE' || e.data.type === 'ENTER_WALK') && onStateChange) onStateChange(e.data.type);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onInteract, onStateChange]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_MODE', value: mode }, '*');
    }
  }, [mode]);

  useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'SET_ACTION', value: action }, '*');
      }
  }, [action]);

  // Pass Environment Data
  useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow && envData) {
          iframeRef.current.contentWindow.postMessage({ type: 'SET_ENV_DATA', payload: envData }, '*');
      }
  }, [envData]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_EQUIPMENT', value: equipment }, '*');
    }
  }, [equipment]);
  
  useEffect(() => {
    if (preEvent && iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'PRE_EVENT', value: preEvent }, '*');
    }
  }, [preEvent]);

  useEffect(() => {
      if (!eventActive && iframeRef.current && iframeRef.current.contentWindow) {
          setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage({ type: 'RESUME' }, '*');
          }, 100);
      }
  }, [eventActive]);

  return (
    <div className="w-full h-full relative">
      <iframe 
        ref={iframeRef}
        srcDoc={makeBackgroundTransparent(code)}
        className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
        title="Voxel Viewer"
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
});

export const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void, mode?: 'GRID' | 'DETAIL' }> = ({ pet, onClick, mode = 'GRID' }) => {
    const theme = ELEMENT_THEMES[pet.element] || ELEMENT_THEMES.Metal;
    
    // PRIORITIZE 3D SNAPSHOT -> ORIGINAL PHOTO -> PROCEDURAL ART
    const displayImage = pet.cardArtUrl || pet.imageSource || getProceduralMonsterArt(pet.name, pet.element);

    return (
        <div onClick={onClick} className="tcg-card w-full aspect-[3/4.5] flex flex-col cursor-pointer group relative bg-gray-900">
             {/* HEADER */}
             <div className={`h-[14%] ${theme.bg} flex items-center justify-between px-2 border-b-4 border-black z-10`}>
                 <span className="font-black text-[10px] uppercase truncate text-white drop-shadow-[2px_2px_0_#000] w-2/3">{pet.name}</span>
                 <div className="flex items-center gap-1">
                    <span className="text-sm drop-shadow-[1px_1px_0_#000]">{theme.icon}</span>
                    <span className="bg-black text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold">Lv.{pet.level}</span>
                 </div>
             </div>

             {/* IMAGE AREA */}
             <div className="flex-1 relative overflow-hidden border-b-4 border-black bg-gradient-to-br from-gray-700 to-black group-hover:bg-gradient-to-br group-hover:from-gray-600 group-hover:to-gray-900 transition-colors">
                 <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="w-full h-full flex items-center justify-center opacity-100 group-hover:scale-105 transition-transform">
                        <img src={displayImage} className="w-full h-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]" alt={pet.name} />
                    </div>
                 </div>
                 <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-white backdrop-blur-md border border-white/30 font-bold uppercase tracking-wide">
                    {pet.stage}
                 </div>
             </div>

             {/* STATS STRIP */}
             <div className="h-[16%] bg-gray-200 p-1 grid grid-cols-3 gap-1 text-[9px] font-mono font-bold">
                <div className="flex flex-col items-center justify-center bg-white rounded border-2 border-gray-400 shadow-[1px_1px_0_#999]">
                    <span className="text-red-600">ATK</span>
                    <span>{pet.atk}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-white rounded border-2 border-gray-400 shadow-[1px_1px_0_#999]">
                    <span className="text-blue-600">DEF</span>
                    <span>{pet.def}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-white rounded border-2 border-gray-400 shadow-[1px_1px_0_#999]">
                    <span className="text-yellow-600">SPD</span>
                    <span>{pet.spd}</span>
                </div>
             </div>

             {/* SKILL AREA */}
             <div className="h-[22%] bg-white border-t-4 border-black p-2 text-[9px] leading-tight z-10 relative skill-text-area">
                 <div className="font-black text-black mb-1 uppercase tracking-tighter bg-yellow-300 inline-block px-1 border border-black rounded-sm transform -rotate-1">
                     {pet.ability || "Basic Glitch"}
                 </div>
                 <p className="text-gray-800 line-clamp-2 font-medium mt-1">
                    {pet.description || "A mysterious digital entity waiting to be unlocked."}
                 </p>
             </div>
        </div>
    );
};
