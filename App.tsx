
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { analyzeObject, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, MonsterStats, LOCATIONS_DB, LocationNode, STARTER_PACKS, determineEvolutionPath, EVO_THRESHOLDS, getProceduralMonsterArt, getRandomEventText, getRandomSpecialEvent, getActionFromText, EquipmentSlot, getPetSpeech, EMOTE_ICONS } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'ONBOARDING' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'COLLECTION' | 'SHOP' | 'ITEMS' | 'EXPLORE';

const SAVE_VERSION = 'v13.9_VECTOR_CHIP_FIX'; 

interface UserProfile {
  name: string;
  level: number;
  exp: number;
  coins: number; 
  currentLocation: string; 
  joinedAt: number;
  inventory: string[]; 
  currentRank: string;
}

interface Pixupet extends MonsterStats {
  voxelCode: string;
  imageSource?: string;
  cardArtUrl?: string;
  currentHp?: number; 
  maxHp?: number; 
  level: number;
  exp: number;
  maxExp: number;
  hunger: number; 
  fatigue: number;
  happiness?: number; 
}

interface FloatingText { id: number; text: string; x: number; y: number; color: string; }

// --- VECTOR ICONS (NEO-POP STYLE) ---

const IconCoin = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block mr-1">
        <circle cx="12" cy="12" r="10" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" fill="#F59E0B" stroke="black" strokeWidth="1" strokeDasharray="2 2" className="animate-[spin_10s_linear_infinite]"/>
        <path d="M10 8h4v8h-4z" fill="#FEF3C7" className="coin-shine"/>
    </svg>
);

const IconBag = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M5 6h14v16H5zM8 2h8v4H8z" className="text-black stroke-black stroke-2" fill="none"/>
        <path d="M6 7h12v14H6z" fill="#A78BFA"/>
        <path d="M9 3h6v3H9z" fill="#7C3AED"/>
        <rect x="11" y="11" width="2" height="6" fill="white"/>
        <rect x="9" y="13" width="6" height="2" fill="white"/>
    </svg>
);

const IconCart = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M2 4h4l3 12h12l2-10H6" stroke="black" strokeWidth="2" fill="none"/>
        <circle cx="9" cy="20" r="2" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <circle cx="19" cy="20" r="2" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <path d="M7 5h14l-1.5 9H8.5z" fill="#60A5FA"/>
    </svg>
);

const IconMap = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" stroke="black" strokeWidth="2" fill="#34D399"/>
        <path d="M9 3v15M15 6v15" stroke="black" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
);

const IconCards = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <rect x="4" y="6" width="12" height="16" rx="1" transform="rotate(-5 10 14)" fill="#F87171" stroke="black" strokeWidth="2"/>
        <rect x="8" y="4" width="12" height="16" rx="1" transform="rotate(5 14 12)" fill="#60A5FA" stroke="black" strokeWidth="2"/>
        <rect x="6" y="2" width="12" height="16" rx="1" fill="#FCD34D" stroke="black" strokeWidth="2"/>
    </svg>
);

const IconScan = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current">
        <path d="M3 7h4l2-3h6l2 3h4v14H3z" fill="#374151" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="13" r="4" fill="#60A5FA" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="13" r="2" fill="#1D4ED8"/>
        <rect x="18" y="9" width="2" height="1" fill="white"/>
    </svg>
);

const IconSkull = () => (
    <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto animate-bounce">
        <path d="M4 8a8 8 0 1 1 16 0c0 4-2 6-4 7v2h-8v-2c-2-1-4-3-4-7z" fill="#EF4444" stroke="black" strokeWidth="2"/>
        <circle cx="9" cy="9" r="2" fill="black"/>
        <circle cx="15" cy="9" r="2" fill="black"/>
        <rect x="11" y="12" width="2" height="3" fill="black"/>
        <path d="M8 20h2v2H8zM14 20h2v2h-2z" fill="black"/>
    </svg>
);

const IconTreasure = () => (
    <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto animate-bounce">
        <path d="M2 8h20l-2 12H4L2 8z" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <path d="M2 8l10-6 10 6H2z" fill="#FCD34D" stroke="black" strokeWidth="2"/>
        <rect x="11" y="10" width="2" height="4" fill="black" opacity="0.3"/>
        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
);

// COMPREHENSIVE ITEM ICON LIBRARY WITH RARITY COLORS
const RARITY_COLORS = {
    Common: '#E5E7EB', // Gray
    Rare: '#60A5FA',   // Neon Blue
    Epic: '#A78BFA',   // Purple
    Legendary: '#FBBF24' // Gold
};

const ItemIcon: React.FC<{ item: GameItem }> = ({ item }) => {
    const id = item.id.toLowerCase();
    const baseColor = RARITY_COLORS[item.rarity] || '#E5E7EB';
    const strokeColor = item.rarity === 'Legendary' ? '#B45309' : 'black';
    
    // PIZZA
    if (id.includes('pizza')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M12 2L2 20h20L12 2z" fill="#FCD34D" stroke={strokeColor} strokeWidth="2"/>
                <circle cx="12" cy="8" r="1.5" fill="#EF4444"/>
                <circle cx="10" cy="14" r="1.5" fill="#EF4444"/>
                <circle cx="15" cy="12" r="1.5" fill="#EF4444"/>
                <circle cx="13" cy="17" r="1.5" fill="#EF4444"/>
                <path d="M2 20h20v2H2z" fill="#D97706" stroke={strokeColor} strokeWidth="1"/>
            </svg>
        );
    }
    // BURGER / STEAK
    if (id.includes('burger') || id.includes('steak')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M4 9c0-4 4-6 8-6s8 2 8 6H4z" fill="#FBBF24" stroke={strokeColor} strokeWidth="2"/>
                <rect x="3" y="15" width="18" height="4" rx="2" fill="#7F1D1D" stroke={strokeColor} strokeWidth="2"/>
                <rect x="4" y="13" width="16" height="2" fill="#22C55E" stroke={strokeColor} strokeWidth="1"/>
                <path d="M4 19h16v3H4z" fill="#FBBF24" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // BOOTS
    if (id.includes('boots')) {
         return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                 <path d="M6 8h8v12H6z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                 <path d="M6 20h12v2H6z" fill="black" />
                 <rect x="14" y="16" width="4" height="4" fill="#FCD34D" stroke={strokeColor} />
                 <path d="M8 8v-2c0-2 2-3 4-3h2" stroke={strokeColor} strokeWidth="2" fill="none"/>
                 {item.rarity === 'Legendary' && <path d="M18 10l4-2-4-2" stroke="#FBBF24" strokeWidth="2"/>}
            </svg>
        );
    }
    // ARMOR / VEST
    if (id.includes('armor') || id.includes('vest')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M5 4h14v14l-7 4-7-4V4z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                <path d="M9 8h6" stroke={strokeColor} strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" fill="#3B82F6" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // DRINK - SODA/POTION
    if (id.includes('soda') || id.includes('potion')) {
        const liquidColor = id.includes('soda') ? '#60A5FA' : id.includes('super') ? '#A855F7' : '#EF4444';
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M9 3h6v4H9z" fill="#9CA3AF" stroke={strokeColor} strokeWidth="2"/>
                <path d="M7 7h10l2 13H5L7 7z" fill="#F3F4F6" stroke={strokeColor} strokeWidth="2"/>
                <path d="M8 10h8l1.5 9h-11L8 10z" fill={liquidColor}/>
                <rect x="11" y="11" width="2" height="6" fill="white" opacity="0.5"/>
            </svg>
        );
    }
    // CHIPS / DRIVERS / MATERIALS - MEMORY CHIP STYLE
    if (id.includes('chip') || id.includes('driver')) {
        let color = '#A78BFA';
        if (id.includes('fire') || id.includes('crimson')) color = '#EF4444';
        if (id.includes('water')) color = '#3B82F6';
        if (id.includes('grass')) color = '#10B981';
        if (id.includes('electric')) color = '#FBBF24';
        if (id.includes('metal')) color = '#94A3B8';
        if (id.includes('dark')) color = '#111827';
        
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                {/* Main Chip Body */}
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#1F2937" stroke={strokeColor} strokeWidth="2"/>
                {/* Inner Core */}
                <rect x="8" y="8" width="8" height="8" rx="1" fill={color}/>
                {/* Gold Pins */}
                <path d="M2 6h2 M2 9h2 M2 12h2 M2 15h2 M2 18h2" stroke="#FBBF24" strokeWidth="2" />
                <path d="M20 6h2 M20 9h2 M20 12h2 M20 15h2 M20 18h2" stroke="#FBBF24" strokeWidth="2" />
                {/* Circuit Lines */}
                <path d="M12 8v-2 M8 12H6 M16 12h2 M12 16v2" stroke="#4B5563" strokeWidth="1"/>
            </svg>
        );
    }
    // GEAR - HELMET / VISOR
    if (id.includes('helm') || id.includes('visor') || id.includes('crown')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M4 13c0-5 4-9 8-9s8 4 8 9v6H4v-6z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                <rect x="7" y="10" width="10" height="4" fill={id.includes('visor') ? '#EF4444' : '#3B82F6'} stroke={strokeColor} strokeWidth="2"/>
                <path d="M12 4v4" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // ACCESSORY (Rings, Charms, Wings)
    if (id.includes('wings') || id.includes('ring') || id.includes('pack') || id.includes('charm')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                 <circle cx="12" cy="12" r="8" fill="none" stroke={baseColor} strokeWidth="3"/>
                 {id.includes('wings') && <path d="M2 12l8-4v8l-8-4zM22 12l-8-4v8l8-4z" fill={baseColor} stroke={strokeColor} />}
                 <circle cx="12" cy="12" r="4" fill={item.rarity === 'Legendary' ? '#FCD34D' : '#F472B6'} stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    
    // MYSTERY BOX / DEFAULT
    return (
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <rect x="4" y="4" width="16" height="16" rx="2" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
            <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="black">?</text>
        </svg>
    );
};

// --- COMPONENTS ---

const VoxelViewer = memo(({ code, mode = 'HABITAT', action = 'WALK', theme = 'Grass', equipment, onInteract, onStateChange, preEvent }: { code: string, mode?: string, action?: string, theme?: string, equipment?: any, onInteract?: ()=>void, onStateChange?: (s:string)=>void, preEvent?: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
        if (e.data.type === 'PET_CLICKED' && onInteract) onInteract();
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

  useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'SET_THEME', value: theme }, '*');
      }
  }, [theme]);

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

  return (
    <div className="w-full h-full relative">
      <iframe 
        ref={iframeRef}
        srcDoc={makeBackgroundTransparent(code)}
        className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
        title="Voxel Viewer"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Click overlay for simple touches if raycasting fails or for general area clicks */}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
});

const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void }> = ({ pet, onClick }) => {
    const theme = ELEMENT_THEMES[pet.element] || ELEMENT_THEMES.Metal;
    
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
                    <div className="w-full h-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <img src={getProceduralMonsterArt(pet.name, pet.element)} className="w-full h-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]" alt={pet.name} />
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

// --- MAIN APP ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile>({ 
      name: 'Tamer', level: 1, exp: 0, coins: 100, currentLocation: 'loc_starter', joinedAt: Date.now(), inventory: [], currentRank: 'Noob' 
  });
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  const [activePetIndex, setActivePetIndex] = useState<number>(0);
  
  // Modals & Overlays
  const [showScan, setShowScan] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState<any>(null);
  const [notifs, setNotifs] = useState<FloatingText[]>([]);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [statusText, setStatusText] = useState("System Online");
  const [selectedCard, setSelectedCard] = useState<Pixupet | null>(null);
  const [showGearSelect, setShowGearSelect] = useState<{slot: EquipmentSlot} | null>(null);
  const [confirmItem, setConfirmItem] = useState<GameItem | null>(null);
  const [preEventEmote, setPreEventEmote] = useState<string | null>(null);

  // Menus
  const [statsOpen, setStatsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  // Interactive State
  const [isPetIdle, setIsPetIdle] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  // FX
  const [purchaseAnim, setPurchaseAnim] = useState<string | null>(null);

  const activePet = inventory[activePetIndex];
  const location = LOCATIONS_DB[user.currentLocation];
  const logScrollRef = useRef<HTMLDivElement>(null);

  // --- LOAD / SAVE ---
  useEffect(() => {
      const saved = localStorage.getItem(`pixupet_save_${SAVE_VERSION}`);
      if (saved) {
          const data = JSON.parse(saved);
          setUser(data.user);
          setInventory(data.inventory);
          setGameState('NEXUS');
      }
  }, []);

  useEffect(() => {
      if (user.level > 0) {
        localStorage.setItem(`pixupet_save_${SAVE_VERSION}`, JSON.stringify({ user, inventory }));
      }
  }, [user, inventory]);

  // --- GAME LOOP ---
  useEffect(() => {
      if (gameState !== 'NEXUS' || activeBattle || activeEvent || isAnalyzing || preEventEmote) return;
      
      const interval = setInterval(() => {
          if (Math.random() > 0.7 && !isPetIdle) { // Only update text if moving, idle handles its own speech
              const txt = getRandomEventText(user.currentLocation);
              setStatusText(txt);
          }
          if (Math.random() > 0.85) { 
             triggerRandomEvent();
          }
      }, 3000);
      return () => clearInterval(interval);
  }, [gameState, activeBattle, activeEvent, user.currentLocation, isAnalyzing, isPetIdle, preEventEmote]);

  // Speech Bubble Logic
  useEffect(() => {
      if (isPetIdle && !speechBubble && Math.random() > 0.6) {
          setSpeechBubble(getPetSpeech());
          setTimeout(() => setSpeechBubble(null), 3000);
      } else if (!isPetIdle) {
          setSpeechBubble(null);
      }
  }, [isPetIdle, speechBubble]);

  useEffect(() => {
      if (logScrollRef.current) {
          logScrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [activeBattle?.logs, activeEvent?.logs]);

  // --- LOGIC ---

  const triggerRandomEvent = async () => {
      const rand = Math.random();
      
      // Determine type first
      let type: 'BATTLE' | 'TREASURE' | 'SPECIAL' = 'SPECIAL';
      if (rand > 0.60) type = 'BATTLE';
      else if (rand > 0.30) type = 'TREASURE';
      
      let emote = '❓';
      if (type === 'BATTLE') emote = EMOTE_ICONS.BATTLE;
      else if (type === 'TREASURE') emote = EMOTE_ICONS.TREASURE;
      else emote = EMOTE_ICONS.DISCOVERY; 

      // 1. PRE-EVENT PHASE
      setPreEventEmote(emote);
      
      // Wait 2 seconds for "Anticipation" animation
      await new Promise(r => setTimeout(r, 2000));
      
      setPreEventEmote(null); // Clear emote signal

      // 2. TRIGGER ACTUAL EVENT
      if (type === 'BATTLE') {
          startAutoBattle();
      } else if (type === 'TREASURE') {
          const item = getLootDrop(user.currentLocation);
          if(item) {
            const ev: any = { type: 'TREASURE', title: 'SECRET STASH', description: 'You found something shiny!', logs: ['Scanning area...', 'Ping detected!', `Uncovered: ${ITEMS_DB[item].name}`], resultText: 'LOOT SECURED!' };
            startAutoEvent(ev, () => addItem(item));
          }
      } else {
          const ev = getRandomSpecialEvent(user.currentLocation);
          if (ev.type === 'HAZARD') { /* handled */ } 
          startAutoEvent(ev, () => {
             if(ev.type === 'DISCOVERY') { addExp(ev.effectValue); addCoins(20); }
             if(ev.type === 'HAZARD') { damagePet(ev.effectValue); }
          });
      }
  };

  const startAutoEvent = (ev: any, onComplete: () => void) => {
      setActiveEvent({ ...ev, currentLogIndex: 0, finished: false });
      let i = 0;
      const interval = setInterval(() => {
          i++;
          if (i >= ev.logs.length) {
              clearInterval(interval);
              setActiveEvent((prev: any) => ({ ...prev, finished: true }));
              onComplete(); 
              setTimeout(() => { setActiveEvent(null); }, 2500); 
          } else {
              setActiveEvent((prev: any) => ({ ...prev, currentLogIndex: i }));
          }
      }, 1000);
  };

  const startAutoBattle = () => {
      const enemy = getRandomEnemy(user.currentLocation, activePet.level, getGenericVoxel);
      const battleState = { enemy, logs: [`A wild ${enemy.name} appeared!`, "Combat protocols initiated!"], finished: false, win: false };
      setActiveBattle(battleState);
      const { win, combatLogs } = runBattleSimulation(activePet, enemy);
      let i = 0;
      const interval = setInterval(() => {
          setActiveBattle((prev: any) => {
              if (!prev) return null;
              return { ...prev, logs: [...prev.logs, combatLogs[i]] };
          });
          i++;
          if (i >= combatLogs.length) {
              clearInterval(interval);
              setActiveBattle((prev: any) => ({ ...prev, finished: true, win }));
              if (win) {
                  const xp = enemy.level * 30;
                  const coins = enemy.level * 20;
                  addExp(xp); addCoins(coins);
                  const loot = getLootDrop(user.currentLocation);
                  if (loot && Math.random() > 0.5) addItem(loot);
              } else { damagePet(10); }
              setTimeout(() => { setActiveBattle(null); }, 2500); 
          }
      }, 800); 
  };

  const runBattleSimulation = (pet: Pixupet, enemy: any) => {
      let pHP = pet.currentHp || 100;
      let eHP = enemy.hp;
      const logs = [];
      let win = false;
      const pAtk = getStat(pet, 'atk');
      const pDef = getStat(pet, 'def');
      
      for(let r=1; r<=6; r++) {
          const dmg = Math.max(1, Math.floor(pAtk * (100/(100+enemy.def)) * (Math.random() * 0.5 + 1.0)));
          eHP -= dmg;
          logs.push(`> You SMAASHED for ${dmg} DMG!`);
          if (eHP <= 0) { win = true; logs.push("> Enemy DESTROYED!"); break; }

          const eDmg = Math.max(1, Math.floor(enemy.atk * (100/(100+pDef)) * (Math.random() * 0.5 + 0.8)));
          pHP -= eDmg;
          logs.push(`> Enemy hit you for ${eDmg} DMG!`);
          if (pHP <= 0) { win = false; logs.push("> Critical Failure!"); break; }
      }
      if (pHP > 0 && eHP > 0) {
          const pRatio = pHP / (pet.maxHp || 100);
          const eRatio = eHP / enemy.maxHp;
          win = pRatio >= eRatio;
          logs.push(win ? "> Enemy retreated! YOU WIN." : "> Tactical retreat. DRAW.");
      }
      return { win, combatLogs: logs };
  };

  const damagePet = (amt: number) => {
      const updated = [...inventory];
      if (updated[activePetIndex]) {
        const p = updated[activePetIndex];
        p.currentHp = Math.max(0, (p.currentHp || 100) - amt);
        setInventory(updated);
        showFloatingText(`-${amt} HP`, 'text-red-500');
      }
  };

  const addExp = (amount: number) => {
      const updated = [...inventory];
      const pet = updated[activePetIndex];
      pet.exp += amount;
      showFloatingText(`+${amount} XP`, 'text-yellow-400');
      if (pet.exp >= pet.maxExp) {
          pet.level++; pet.exp = 0; pet.maxExp = Math.floor(pet.maxExp * 1.4);
          pet.maxHp = (pet.maxHp || 100) + 20; pet.currentHp = pet.maxHp;
          pet.atk += 5; pet.def += 5; pet.spd += 5;
          setShowLevelUp(pet);
      }
      setInventory(updated);
      const newExp = user.exp + amount;
      if (newExp >= user.level * 150) {
          setUser({ ...user, exp: 0, level: user.level + 1 });
          showFloatingText("TAMER LEVEL UP!", "text-white");
      } else { setUser({ ...user, exp: newExp }); }
  };

  const addCoins = (amt: number) => {
      setUser(u => ({ ...u, coins: u.coins + amt }));
      showFloatingText(`+${amt} G`, 'text-yellow-300');
  };

  const addItem = (itemId: string) => {
      setUser(u => ({ ...u, inventory: [...u.inventory, itemId] }));
      showFloatingText(`+ ${ITEMS_DB[itemId].name}!`, 'text-green-400');
  };

  const removeItem = (index: number) => {
      setUser(u => {
          const newInv = [...u.inventory];
          newInv.splice(index, 1);
          return { ...u, inventory: newInv };
      });
  };

  const showFloatingText = (text: string, color: string) => {
      const id = Date.now() + Math.random();
      setNotifs(prev => [...prev, { id, text, x: 50, y: 40, color }]);
      setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 2000);
  };

  const handleScan = async () => {
      if (!scanPreview) return;
      setIsAnalyzing(true);
      try {
          const traits = await analyzeObject(scanPreview);
          if(!traits.hp) traits.hp = 100;
          if(!traits.atk) traits.atk = 15;
          if(!traits.def) traits.def = 10;
          if(!traits.spd) traits.spd = 10;
          
          const voxelCode = getGenericVoxel(traits.element, traits.bodyType, 'Noob', traits.visualTraits);
          const newPet: Pixupet = {
              id: `pet_${Date.now()}`, dateCreated: Date.now(), ...traits,
              voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 80, fatigue: 0, happiness: 80,
              stage: 'Noob', rank: 'Common', potential: 50, currentHp: traits.hp, maxHp: traits.hp,
              ability: "Glitch Soul", moves: [], imageSource: scanPreview
          };
          setInventory([...inventory, newPet]);
          setActivePetIndex(inventory.length); 
          setGameState('NEXUS');
          setShowScan(false);
          setScanPreview(null);
          showFloatingText("CREATION SUCCESS!", "text-green-400");
      } catch (e) { alert("Scan failed."); } finally { setIsAnalyzing(false); }
  };

  const handleStarterSelect = (starter: any) => {
      const voxelCode = getGenericVoxel(starter.element, starter.bodyType, 'Noob', starter.visualTraits);
      const newPet: Pixupet = {
          id: `starter_${Date.now()}`, dateCreated: Date.now(), name: starter.name, element: starter.element,
          description: starter.description, visual_design: starter.visual_design, bodyType: starter.bodyType,
          visualTraits: starter.visualTraits, rarity: 'Common', nature: 'Brave',
          hp: starter.stats.hp, maxHp: starter.stats.hp, currentHp: starter.stats.hp,
          atk: starter.stats.atk, def: starter.stats.def, spd: starter.stats.spd, int: 10,
          voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 100, fatigue: 0, happiness: 100,
          stage: 'Noob', rank: 'Starter', potential: 80, ability: 'Starter Will', moves: []
      };
      setInventory([newPet]);
      setActivePetIndex(0);
      setGameState('NEXUS');
  };

  const getStat = (pet: Pixupet, stat: 'atk'|'def'|'spd'|'hp') => {
      let base = pet[stat] || 0;
      if (stat === 'hp' && pet.maxHp) base = pet.maxHp;
      if (pet.equipment) {
          Object.entries(pet.equipment).forEach(([slot, itemId]) => {
              if(itemId) {
                  const item = ITEMS_DB[itemId as string];
                  if (item && item.statBonus && item.statBonus[stat]) base += item.statBonus[stat]!;
              }
          });
      }
      return base;
  };

  const handleEquip = (slot: EquipmentSlot, itemId: string) => {
      const updated = [...inventory];
      const pet = updated[activePetIndex];
      if (!pet.equipment) pet.equipment = {};
      pet.equipment[slot === 'HEAD' ? 'head' : slot === 'BODY' ? 'body' : 'accessory'] = itemId;
      setInventory(updated);
      setShowGearSelect(null);
  };

  const handleUseItem = (item: GameItem, invIndex: number) => {
      if (item.type === 'Food' || item.type === 'Consumable') {
          const updated = [...inventory];
          const pet = updated[activePetIndex];
          if (item.effect) {
              updated[activePetIndex] = item.effect(pet);
              setInventory(updated);
              removeItem(invIndex);
              showFloatingText(`Used ${item.name}!`, 'text-green-400');
              setConfirmItem(null);
          }
      } else {
          showFloatingText("Cannot use this item here.", "text-red-400");
      }
  };

  const handlePurchase = (item: GameItem) => {
      if (user.coins >= item.price) {
          addCoins(-item.price);
          addItem(item.id);
          setPurchaseAnim(item.id);
          setTimeout(() => setPurchaseAnim(null), 1000);
      } else {
          alert("Not enough coins!");
      }
  };

  const handlePetInteraction = () => {
      setSpeechBubble("Hey! Don't poke me!");
      setTimeout(() => setSpeechBubble(null), 2000);
      showFloatingText("♥", "text-pink-500");
  };

  // --- RENDER ---

  if (gameState === 'SPLASH') return (
      <div className="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden bg-yellow-300 p-4">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dot-grid.png')] opacity-20"></div>
          <div className="voxel-logo-container text-4xl sm:text-6xl mb-8 z-10 tracking-widest flex flex-wrap justify-center gap-2">
              {['P','I','X','U','P','E','T'].map((char,i) => (
                  <span key={i} className="logo-char" style={{animationDelay: `${i*0.1}s`}}>{char}</span>
              ))}
          </div>
          <div className="neo-pop-box px-6 py-3 mb-8 rotate-2 bg-white max-w-xs sm:max-w-md text-center">
               <h2 className="font-['Bangers'] text-2xl sm:text-3xl text-black tracking-wide">Turn Anything into a Pet!</h2>
          </div>
          <button onClick={() => setGameState(inventory.length > 0 ? 'NEXUS' : 'ONBOARDING')} 
              className="pop-btn btn-primary text-xl sm:text-2xl px-12 sm:px-16 py-4 sm:py-6 pop-in hover:scale-105 active:scale-95 transition-all">
              PRESS START
          </button>
      </div>
  );

  if (gameState === 'ONBOARDING') return (
      <div className="w-full h-screen bg-yellow-100 text-black flex flex-col items-center justify-center p-6">
           <h1 className="text-4xl font-black mb-10 font-['Bangers'] tracking-wider drop-shadow-sm">SYSTEM INITIALIZED</h1>
           <div className="grid grid-cols-1 gap-8 w-full max-w-md">
               <button onClick={() => setGameState('SCAN')} className="bg-blue-500 p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_#000] flex flex-col items-center transition-all">
                   <IconScan />
                   <span className="text-2xl font-black text-white stroke-black mt-2">REALITY HACK</span>
               </button>
               <button onClick={() => setGameState('STARTER_SELECT')} className="bg-purple-500 p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_#000] flex flex-col items-center transition-all">
                   <div className="text-5xl mb-2">🥚</div>
                   <span className="text-2xl font-black text-white">LOAD PRESET</span>
               </button>
           </div>
      </div>
  );

  if (gameState === 'STARTER_SELECT') return (
      <div className="w-full h-screen bg-green-100 flex flex-col items-center pt-16 pb-6 px-4 overflow-y-auto">
          <div className="neo-pop-box px-8 py-4 mb-8 bg-white -rotate-2">
              <h2 className="text-3xl font-black font-['Bangers'] tracking-wide">CHOOSE YOUR MAIN</h2>
          </div>
          <div className="flex flex-col gap-6 w-full max-w-md">
              {STARTER_PACKS.map(starter => (
                  <div key={starter.id} onClick={() => handleStarterSelect(starter)}
                       className="bg-white p-5 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_#000] transition-all cursor-pointer relative group">
                      <div className="flex justify-between items-center mb-3 border-b-2 border-gray-200 pb-2">
                          <span className={`font-black text-xl ${ELEMENT_THEMES[starter.element].text} px-3 py-1 rounded-lg bg-black border-2 border-white shadow-sm`}>{starter.name}</span>
                          <span className="text-3xl bg-gray-100 rounded-full p-1 border-2 border-black">{ELEMENT_THEMES[starter.element].icon}</span>
                      </div>
                      <p className="text-gray-800 font-bold text-sm mb-3 bg-gray-100 p-2 rounded border border-gray-300">"{starter.description}"</p>
                      <div className="flex gap-2 text-xs font-black font-mono">
                          <span className="bg-red-200 text-red-900 px-2 py-1 rounded border border-black">ATK: {starter.stats.atk}</span>
                          <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded border border-black">DEF: {starter.stats.def}</span>
                          <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded border border-black">SPD: {starter.stats.spd}</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  // --- NEXUS (MAIN GAME) ---
  return (
    <div className="w-full h-screen relative bg-black overflow-hidden font-sans select-none">
      {/* VOXEL LAYER */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {activePet && <VoxelViewer 
            code={activePet.voxelCode} 
            action={getActionFromText(statusText)} 
            theme={location.environmentType} 
            equipment={activePet.equipment} 
            onInteract={handlePetInteraction}
            onStateChange={(state) => setIsPetIdle(state === 'ENTER_IDLE')}
            preEvent={preEventEmote || undefined}
        />}
      </div>

      {/* SPEECH BUBBLE */}
      {speechBubble && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pop-in pointer-events-none">
              <div className="bg-white border-4 border-black rounded-2xl p-3 relative shadow-[4px_4px_0_#000] max-w-[200px] text-center">
                  <p className="text-black font-black text-sm">{speechBubble}</p>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"></div>
                  <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
              </div>
          </div>
      )}

      {/* HUD TOP (NEO-POP STYLE) */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start z-10 pointer-events-none safe-top">
          {/* NAME PLATE */}
          <div className="neo-pop-box p-2 pointer-events-auto cursor-pointer flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform bg-white" onClick={()=>setStatsOpen(true)}>
              <div className="flex flex-col">
                  <div className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1">
                      <span className="bg-black text-white px-1 rounded">LV.{activePet?.level}</span> {activePet?.name}
                  </div>
                  <div className="w-32 h-3 bg-gray-300 rounded-full mt-1 overflow-hidden border-2 border-black relative">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 border-r-2 border-black" style={{width: `${(activePet?.exp / activePet?.maxExp)*100}%`}}></div>
                  </div>
              </div>
              <div className="bg-blue-500 text-white border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-[2px_2px_0_#000]">i</div>
          </div>

          {/* RESOURCE PLATE */}
          <div className="neo-pop-box p-2 flex flex-col items-end bg-white">
              <div className="font-black text-yellow-600 flex items-center gap-1 text-base drop-shadow-sm">
                  <IconCoin /> {user.coins}
              </div>
              <div className="text-[9px] font-bold text-white uppercase bg-black px-2 py-0.5 rounded-full mt-1 border border-gray-500">{location.name}</div>
          </div>
      </div>

      {/* FLOATING NOTIFICATIONS - STACKED DOWNWARDS */}
      {notifs.map((n, idx) => (
          <div key={n.id} className={`absolute z-[60] text-lg font-black ${n.color} float-down pointer-events-none w-full text-center drop-shadow-[2px_2px_0_#000] stroke-black text-stroke`} 
               style={{top: `${100 + idx * 35}px`, left: '0', right: '0', WebkitTextStroke: '0.5px black'}}>
              {n.text}
          </div>
      ))}

      {/* SHOP PURCHASE ANIMATION */}
      {purchaseAnim && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none">
              <div className="shop-pop w-32 h-32">
                  <ItemIcon item={ITEMS_DB[purchaseAnim]} />
              </div>
          </div>
      )}

      {/* EXPLORE STATUS */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-black/90 text-white px-6 py-2 rounded-full border-2 border-white/50 backdrop-blur text-xs font-black tracking-widest uppercase shadow-lg">
              {statusText} <span className="animate-pulse">...</span>
          </div>
      </div>

      {/* BOTTOM NAVIGATION (FLOATING NEO-POP) */}
      <div className="absolute bottom-4 left-4 right-4 bg-white border-4 border-black rounded-2xl p-2 flex justify-between items-end z-20 shadow-[0_10px_20px_rgba(0,0,0,0.4)] h-20 safe-bottom">
          
          <button onClick={()=>{ setGameState('COLLECTION') }} className="flex flex-col items-center justify-center w-1/5 h-full group active:scale-95 transition-transform">
              <IconCards />
              <span className="text-[9px] font-black uppercase mt-1">Cards</span>
          </button>

          <button onClick={()=>{ setItemsOpen(true) }} className="flex flex-col items-center justify-center w-1/5 h-full group active:scale-95 transition-transform">
              <IconBag />
              <span className="text-[9px] font-black uppercase mt-1">Items</span>
          </button>

          {/* CENTER SCAN BUTTON */}
          <div className="relative w-1/5 flex justify-center z-30">
              <button onClick={()=>setShowScan(true)} className="absolute -top-12 bg-yellow-400 w-24 h-24 rounded-full border-4 border-black flex items-center justify-center shadow-[0px_6px_0px_0px_#000] hover:-translate-y-2 hover:shadow-[0px_10px_0px_0px_#000] active:translate-y-1 active:shadow-[0px_2px_0px_0px_#000] transition-all overflow-hidden">
                  <div className="text-white drop-shadow-md relative z-10"><IconScan /></div>
              </button>
          </div>

          <button onClick={()=>{ setShopOpen(true) }} className="flex flex-col items-center justify-center w-1/5 h-full group active:scale-95 transition-transform">
              <IconCart />
              <span className="text-[9px] font-black uppercase mt-1">Shop</span>
          </button>

          <button onClick={()=>{ setExploreOpen(true) }} className="flex flex-col items-center justify-center w-1/5 h-full group active:scale-95 transition-transform">
              <IconMap />
              <span className="text-[9px] font-black uppercase mt-1">Map</span>
          </button>
      </div>

      {/* --- MODALS --- */}
      
      {activeBattle && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[10px_10px_0_#000] flex flex-col h-[75vh] pop-in">
                  <div className="bg-red-500 text-white p-3 text-center font-black text-2xl tracking-widest border-b-4 border-black flex justify-center items-center gap-2 italic transform skew-x-[-5deg]">
                      <IconSkull /> WILD ENCOUNTER
                  </div>
                  <div className="flex-1 bg-gradient-to-b from-slate-800 to-black relative overflow-hidden flex border-b-4 border-black">
                       {/* Strict 50/50 split */}
                       <div className="w-1/2 h-full relative border-r-4 border-black">
                           <VoxelViewer code={activePet.voxelCode} mode="BATTLE_PLAYER" equipment={activePet.equipment} />
                           <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-1 border-2 border-black rounded transform -skew-x-12 shadow-md">YOU</div>
                       </div>
                       <div className="w-1/2 h-full relative">
                           <VoxelViewer code={activeBattle.enemy.voxelCode} mode="BATTLE_ENEMY" />
                           <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-2 py-1 border-2 border-black rounded transform -skew-x-12 shadow-md">ENEMY</div>
                       </div>
                       
                       {activeBattle.finished && (
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm animate-in fade-in zoom-in">
                               <h1 className={`text-6xl font-black ${activeBattle.win ? 'text-yellow-400 stroke-black' : 'text-red-500 stroke-black'} drop-shadow-[6px_6px_0_#000] -rotate-6 mb-4`} style={{WebkitTextStroke: '2px black'}}>
                                   {activeBattle.win ? 'VICTORY!' : 'DEFEATED'}
                               </h1>
                           </div>
                       )}
                  </div>
                  <div className="h-[30%] bg-gray-100 p-4 font-mono text-xs overflow-y-auto flex flex-col gap-2">
                      {activeBattle.logs.map((log:string, i:number) => (
                          <div key={i} className="text-black font-bold border-l-4 border-black pl-2 bg-white p-1 shadow-sm">
                              {log}
                          </div>
                      ))}
                      <div ref={logScrollRef} />
                  </div>
              </div>
          </div>
      )}

      {activeEvent && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-md bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[12px_12px_0_#000] pop-in">
                  <div className={`p-4 text-center font-black text-2xl border-b-4 border-black tracking-wider ${activeEvent.type === 'HAZARD' ? 'bg-red-500 text-white' : 'bg-blue-400 text-black'}`}>
                      {activeEvent.title}
                  </div>
                  <div className="p-8 text-center min-h-[220px] flex flex-col items-center justify-center relative bg-yellow-50">
                      {!activeEvent.finished ? (
                           <div className="flex flex-col gap-4 w-full items-center">
                               <div className="mb-4 drop-shadow-md">
                                   {activeEvent.type === 'TREASURE' ? <IconTreasure /> : activeEvent.type === 'HAZARD' ? <IconSkull /> : <IconMap />}
                               </div>
                               {activeEvent.logs.slice(0, activeEvent.currentLogIndex + 1).map((l:string, i:number) => (
                                   <p key={i} className="text-lg font-black text-gray-800 fade-in bg-white border-2 border-black px-4 py-2 rounded-lg w-full shadow-[2px_2px_0_#ccc]">{l}</p>
                               ))}
                           </div>
                      ) : (
                           <h2 className="text-5xl font-black text-green-500 pop-in drop-shadow-[3px_3px_0_black] -rotate-3">{activeEvent.resultText}</h2>
                      )}
                  </div>
              </div>
          </div>
      )}

      {gameState === 'COLLECTION' && (
          <div className="absolute inset-0 bg-yellow-100 z-40 overflow-y-auto pt-24 pb-24 px-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
               <div className="fixed top-0 left-0 right-0 bg-white/95 p-4 border-b-4 border-black z-50 flex justify-between items-center shadow-lg safe-top">
                   <h2 className="text-black font-black text-2xl tracking-wide flex items-center gap-2">
                       <IconCards /> MY BINDER 
                       <span className="bg-black text-white text-sm px-3 py-1 rounded-full">{inventory.length}</span>
                   </h2>
                   <button onClick={() => setGameState('NEXUS')} className="bg-red-500 text-white w-10 h-10 rounded-lg flex items-center justify-center font-black border-3 border-black hover:bg-red-400 shadow-[4px_4px_0_#000]">✕</button>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                   {inventory.map(pet => (
                       <div key={pet.id} className="transform transition-transform hover:scale-105 active:scale-95">
                           <PixuCard pet={pet} onClick={() => setSelectedCard(pet)} />
                       </div>
                   ))}
               </div>
          </div>
      )}

      {shopOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden border-4 border-black shadow-[12px_12px_0_#000] flex flex-col h-[85vh] pop-in">
                   <div className="bg-purple-400 p-4 border-b-4 border-black flex justify-between items-center">
                       <h2 className="font-black text-2xl text-white flex items-center gap-2 drop-shadow-md"><IconCart /> ITEM SHOP</h2>
                       <div className="flex gap-3 items-center">
                           <span className="font-black text-black bg-yellow-400 px-3 py-1 rounded-lg border-2 border-black shadow-sm"><IconCoin /> {user.coins}</span>
                           <button onClick={()=>setShopOpen(false)} className="text-2xl font-black text-white hover:scale-110 drop-shadow-md">✕</button>
                       </div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-4 bg-gray-50">
                       {['potion_small', 'pixel_pizza', 'helm_iron', 'armor_vest', 'driver_crimson', 'acc_boots', 'helm_visor', 'acc_ring', 'mystery_box'].map(id => {
                           const item = ITEMS_DB[id];
                           return (
                               <div key={id} className="flex items-center bg-white p-3 rounded-xl border-3 border-black shadow-[4px_4px_0_#ccc] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#999] transition-all">
                                   <div className="mr-4 bg-gray-100 w-14 h-14 flex items-center justify-center rounded-full border-2 border-black">
                                        <div className="w-8 h-8"><ItemIcon item={item} /></div>
                                   </div>
                                   <div className="flex-1">
                                       <div className="font-black text-base">{item.name}</div>
                                       <div className="text-xs text-gray-600 font-bold">{item.description}</div>
                                   </div>
                                   <button onClick={() => handlePurchase(item)} className="pop-btn btn-success text-xs py-2 px-3 border-2 shadow-[2px_2px_0_#000]">
                                       {item.price} G
                                   </button>
                               </div>
                           );
                       })}
                   </div>
               </div>
          </div>
      )}

      {exploreOpen && (
          <div className="absolute inset-0 z-40 bg-slate-800 overflow-auto">
               <div className="fixed top-0 left-0 right-0 bg-slate-900/95 p-4 border-b-4 border-white z-50 flex justify-between items-center shadow-lg safe-top">
                   <h2 className="text-white font-black text-2xl flex items-center gap-2 italic"><IconMap /> WORLD MAP</h2>
                   <button onClick={() => setExploreOpen(false)} className="bg-red-500 w-10 h-10 rounded-lg border-3 border-white text-white font-black shadow-md">✕</button>
               </div>
               <div className="w-[200%] h-[200%] relative map-grid p-20 pt-32 origin-top-left">
                   {Object.values(LOCATIONS_DB).map(loc => {
                       const isCurrent = user.currentLocation === loc.id;
                       // UNLOCK LOGIC FIX: Check ACTIVE PET LEVEL too
                       const isLocked = Math.max(user.level, activePet?.level || 0) < loc.levelReq;
                       
                       return (
                           <div key={loc.id} id={loc.id}
                                className={`absolute w-32 h-32 flex flex-col items-center justify-center text-center rounded-full border-4 transition-all duration-300 cursor-pointer
                                    ${isCurrent ? 'scale-125 border-yellow-400 shadow-[0_0_0_6px_rgba(250,204,21,0.5)] z-20' : 'border-white z-10 hover:scale-110'}
                                    ${isLocked ? 'bg-gray-600 grayscale opacity-60' : loc.color}`}
                                style={{left: `${loc.x}%`, top: `${loc.y}%`}}
                                onClick={() => {
                                    if(!isLocked) {
                                        setUser(u => ({ ...u, currentLocation: loc.id }));
                                        setExploreOpen(false);
                                        setStatusText(`Traveling to ${loc.name}...`);
                                    } else { alert(`Zone Locked! Requires Lv.${loc.levelReq}`); }
                                }}>
                                <div className="text-3xl mb-1 drop-shadow-md">{isLocked ? '🔒' : '📍'}</div>
                                <div className="font-black text-xs leading-tight px-2 bg-black/60 text-white rounded backdrop-blur-sm border border-white/20">{loc.name}</div>
                                {isLocked && <div className="text-[9px] mt-1 font-black bg-red-600 text-white px-1.5 py-0.5 rounded border border-white">Lv.{loc.levelReq}</div>}
                           </div>
                       );
                   })}
                   <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50">
                       {Object.values(LOCATIONS_DB).map(loc => 
                           loc.connections.map(targetId => {
                               const target = LOCATIONS_DB[targetId];
                               return (
                                   <line key={`${loc.id}-${targetId}`} x1={`${loc.x + 4}%`} y1={`${loc.y + 4}%`} x2={`${target.x + 4}%`} y2={`${target.y + 4}%`} stroke="white" strokeWidth="4" strokeDasharray="10,10" strokeLinecap="round" />
                               );
                           })
                       )}
                   </svg>
               </div>
          </div>
      )}

      {selectedCard && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden border-4 border-black shadow-[0_0_50px_rgba(255,255,255,0.3)] flex flex-col max-h-[90vh] pop-in">
                   <div className="bg-gray-100 p-4 flex justify-between items-center border-b-4 border-black">
                       <h3 className="font-black text-xl uppercase tracking-wider">Data Sheet</h3>
                       <button onClick={()=>setSelectedCard(null)} className="text-3xl hover:text-red-500 font-black leading-none">×</button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-1 bg-blue-50">
                       <div className="w-3/4 mx-auto mb-6 transform hover:rotate-1 transition-transform">
                           <PixuCard pet={selectedCard} />
                       </div>
                       <div className="mb-6 neo-pop-box p-3 bg-white">
                           <h4 className="font-black text-xs text-gray-500 mb-2 uppercase text-center">Current Loadout</h4>
                           <div className="grid grid-cols-3 gap-3">
                               {['HEAD', 'BODY', 'ACCESSORY'].map(slot => {
                                   const equippedId = selectedCard.equipment?.[slot.toLowerCase() as keyof typeof selectedCard.equipment];
                                   const item = equippedId ? ITEMS_DB[equippedId] : null;
                                   return (
                                       <div key={slot} onClick={() => setShowGearSelect({slot: slot as EquipmentSlot})}
                                            className="aspect-square bg-gray-100 rounded-xl border-2 border-black flex items-center justify-center cursor-pointer hover:bg-blue-100 shadow-[2px_2px_0_#ccc] relative group">
                                           {item ? <div className="w-8 h-8"><ItemIcon item={item} /></div> : <span className="text-[9px] font-black text-gray-400">{slot}</span>}
                                           <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-6 h-6 rounded-full border-2 border-black flex items-center justify-center group-hover:scale-110 transition-transform font-black">+</div>
                                       </div>
                                   );
                               })}
                           </div>
                       </div>
                       <div className="flex flex-col gap-3 mt-auto">
                           <button onClick={()=>{ 
                               const idx = inventory.findIndex(p => p.id === selectedCard.id);
                               setActivePetIndex(idx);
                               setSelectedCard(null);
                               setGameState('NEXUS');
                               showFloatingText("COMPANION SET!", "text-blue-400");
                           }} className="pop-btn btn-primary w-full">SET ACTIVE</button>
                           {(selectedCard.level >= EVO_THRESHOLDS.PRO && selectedCard.stage === 'Noob') || 
                            (selectedCard.level >= EVO_THRESHOLDS.ELITE && selectedCard.stage === 'Pro') ||
                            (selectedCard.level >= EVO_THRESHOLDS.LEGEND && selectedCard.stage === 'Elite') ? (
                                <button onClick={async () => {
                                    const evo = await evolveVoxelScene(selectedCard);
                                    const updated = [...inventory];
                                    const idx = inventory.findIndex(p => p.id === selectedCard.id);
                                    updated[idx] = { 
                                        ...updated[idx], 
                                        stage: evo.nextStage, 
                                        voxelCode: evo.code, 
                                        name: evo.nextName,
                                        atk: Math.floor(updated[idx].atk * 1.5),
                                        def: Math.floor(updated[idx].def * 1.5),
                                        hp: Math.floor(updated[idx].hp * 1.5),
                                        maxHp: Math.floor(updated[idx].maxHp! * 1.5)
                                    };
                                    setInventory(updated);
                                    setSelectedCard(updated[idx]);
                                    alert(`${selectedCard.name} GLOW UP SUCCESSFUL!`);
                                }} className="pop-btn btn-warning w-full animate-pulse shadow-[0_0_15px_gold] border-yellow-600">🧬 EVOLVE!</button>
                            ) : null}
                       </div>
                   </div>
               </div>
          </div>
      )}

      {showGearSelect && selectedCard && (
          <div className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-5 border-4 border-black shadow-2xl pop-in">
                  <h3 className="font-black mb-4 text-lg uppercase border-b-4 border-black pb-2">Equip {showGearSelect.slot}</h3>
                  <div className="grid grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-2">
                      {user.inventory.filter(id => ITEMS_DB[id].type === 'Gear' && ITEMS_DB[id].slot === showGearSelect.slot).map((id, i) => {
                          const item = ITEMS_DB[id];
                          return (
                            <div key={i} onClick={() => { handleEquip(showGearSelect.slot, id); }} 
                               className="aspect-square border-2 border-black hover:bg-blue-100 cursor-pointer rounded-xl flex flex-col items-center justify-center shadow-[3px_3px_0_#999] active:translate-y-1 active:shadow-none transition-all">
                              <div className="w-8 h-8"><ItemIcon item={item} /></div>
                            </div>
                          );
                      })}
                  </div>
                  <button onClick={()=>setShowGearSelect(null)} className="mt-4 w-full py-3 bg-gray-200 rounded-xl border-3 border-black font-black hover:bg-gray-300 transition-colors">CANCEL</button>
              </div>
          </div>
      )}

      {itemsOpen && (
          <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4 backdrop-blur">
               <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden border-4 border-black shadow-2xl flex flex-col h-[70vh] pop-in">
                   <div className="bg-green-400 p-4 border-b-4 border-black flex justify-between items-center">
                       <h2 className="font-black text-xl text-white drop-shadow-md flex items-center gap-2"><IconBag /> BACKPACK</h2>
                       <button onClick={()=>setItemsOpen(false)} className="font-black text-xl w-8 h-8 hover:bg-green-500 rounded text-white">✕</button>
                   </div>
                   {/* UPDATED TO LIST VIEW WITH DETAILS */}
                   <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-green-50">
                       {user.inventory.length === 0 ? (
                           <div className="text-center text-gray-500 font-bold mt-10">Your bag is empty!</div>
                       ) : (
                           user.inventory.map((id, i) => {
                               const item = ITEMS_DB[id];
                               return (
                                 <div key={i} onClick={() => setConfirmItem(item)} className="bg-white rounded-xl border-3 border-black flex items-center p-3 relative group shadow-[3px_3px_0_#ccc] hover:-translate-y-1 hover:shadow-[4px_4px_0_#999] transition-all cursor-pointer">
                                     <div className="w-12 h-12 mr-4"><ItemIcon item={item} /></div>
                                     <div className="flex-1">
                                        <div className="font-black text-base">{item.name}</div>
                                        <div className="text-xs font-bold text-gray-500">{item.description}</div>
                                     </div>
                                     <div className={`text-[9px] font-black px-2 py-1 rounded border border-black uppercase ${item.rarity === 'Legendary' ? 'bg-yellow-300' : item.rarity === 'Epic' ? 'bg-purple-300' : item.rarity === 'Rare' ? 'bg-blue-300' : 'bg-gray-200'}`}>
                                         {item.rarity}
                                     </div>
                                 </div>
                               );
                           })
                       )}
                   </div>
               </div>
          </div>
      )}

      {/* ITEM CONFIRMATION POPUP */}
      {confirmItem && itemsOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 border-4 border-black shadow-xl pop-in text-center">
                  <h3 className="text-xl font-black mb-2">Use {confirmItem.name}?</h3>
                  <div className="w-20 h-20 mx-auto mb-4"><ItemIcon item={confirmItem} /></div>
                  <p className="text-sm font-bold text-gray-600 mb-6">{confirmItem.description}</p>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmItem(null)} className="flex-1 bg-gray-200 py-3 rounded-xl border-3 border-black font-black">CANCEL</button>
                      <button onClick={() => {
                          // Find index of item to remove specific instance
                          const idx = user.inventory.indexOf(confirmItem.id);
                          if (idx !== -1) handleUseItem(confirmItem, idx);
                      }} className="flex-1 bg-green-400 py-3 rounded-xl border-3 border-black font-black hover:bg-green-500 shadow-[2px_2px_0_black]">USE / EQUIP</button>
                  </div>
              </div>
          </div>
      )}

      {showScan && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                  {!scanPreview ? (
                    <>
                      <video id="cam-feed" autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="relative z-10 text-white text-center p-6">
                          <label className="bg-white text-black px-8 py-5 rounded-full font-black text-xl cursor-pointer border-4 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-105 transition-transform active:scale-95">
                              ACTIVATE LENS
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => setScanPreview(reader.result as string);
                                      reader.readAsDataURL(file);
                                  }
                              }} />
                          </label>
                      </div>
                    </>
                  ) : (
                      <img src={scanPreview} className="w-full h-full object-contain" alt="Preview" />
                  )}
                  {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                          <div className="text-green-400 font-black text-3xl animate-pulse mb-6 tracking-widest drop-shadow-[0_0_10px_green]">DECODING...</div>
                          <div className="w-64 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-green-500 shadow-[0_0_15px_green]">
                              <div className="h-full bg-green-500 animate-[width_1.5s_ease-in-out_infinite]" style={{width: '100%'}}></div>
                          </div>
                      </div>
                  )}
              </div>
              {scanPreview && !isAnalyzing && (
                  <div className="p-6 bg-black flex gap-4 safe-bottom">
                      <button onClick={() => setScanPreview(null)} className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-black border-2 border-gray-500 hover:bg-gray-700">RETRY</button>
                      <button onClick={handleScan} className="flex-1 bg-green-500 text-black py-4 rounded-xl font-black border-2 border-white shadow-[0_0_20px_green] hover:scale-105 transition-transform">MATERIALIZE</button>
                  </div>
              )}
              {!scanPreview && <button onClick={() => setShowScan(false)} className="absolute top-6 right-6 text-white text-2xl bg-black/50 w-12 h-12 rounded-full flex items-center justify-center font-black border-2 border-white hover:bg-red-500 transition-colors">✕</button>}
          </div>
      )}
    </div>
  );
}
