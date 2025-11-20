
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { generateVoxelScene, analyzeObject, MonsterStats, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_CHART, AITactic, TACTIC_MULTIPLIERS, WEATHER_MULTIPLIERS, WeatherType } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'NEXUS' | 'SCAN' | 'INVENTORY' | 'ARENA' | 'SYNTHESIS' | 'ERROR';
type EventType = 'WILD_BATTLE' | 'TREASURE' | 'WEATHER_CHANGE';

interface UserProfile {
  name: string;
  level: number;
  exp: number;
  coins: number; 
  joinedAt: number;
  battlesWon: number;
  currentRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  inventory: string[]; 
}

interface Pixupet extends MonsterStats {
  voxelCode: string;
  imageSource: string;
  cardArtUrl?: string;
  currentHp?: number; 
  maxHp?: number; 
  level: number;
  exp: number;
  maxExp: number;
  hunger: number; 
  fatigue: number;
}

interface FloatingText {
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
}

interface RandomEvent {
    type: EventType;
    data: any; // Enemy Pet or Item
    step: 'INTRO' | 'ACTION' | 'RESULT';
    logs: string[];
    winner?: 'PLAYER' | 'ENEMY';
    reward?: string;
}

// --- CONSTANTS ---
const SCAN_PHRASES = [
    "DETECTING SOUL RESONANCE...",
    "DECRYPTING MATTER MATRIX...",
    "WEAVING DATA STRANDS...",
    "MATERIALIZING ENTITY..."
];

const ELEMENT_THEMES: any = {
  Fire: { bg: 'bg-red-400', text: 'text-white', icon: '🔥' },
  Water: { bg: 'bg-blue-400', text: 'text-white', icon: '💧' },
  Grass: { bg: 'bg-green-400', text: 'text-black', icon: '🌿' },
  Electric: { bg: 'bg-yellow-400', text: 'text-black', icon: '⚡' },
  Psychic: { bg: 'bg-purple-400', text: 'text-white', icon: '🔮' },
  Metal: { bg: 'bg-gray-400', text: 'text-black', icon: '⚙️' },
  Dark: { bg: 'bg-gray-800', text: 'text-white', icon: '🌑' },
  Light: { bg: 'bg-yellow-100', text: 'text-black', icon: '✨' },
  Spirit: { bg: 'bg-indigo-400', text: 'text-white', icon: '👻' },
  Toxic: { bg: 'bg-lime-400', text: 'text-black', icon: '☣️' },
};

const HABITAT_PATTERNS: any = {
  Fire: 'bg-red-50', Water: 'bg-blue-50', Grass: 'bg-green-50', 
  Electric: 'bg-yellow-50', Metal: 'bg-gray-100', Dark: 'bg-gray-900'
};

const ICONS = {
    SCAN: "M3,10 L5,10 L5,16 L11,16 L11,18 L3,18 L3,10 Z M13,18 L19,18 L19,16 L21,16 L21,18 L21,21 L13,21 L13,18 Z M19,8 L21,8 L21,3 L13,3 L13,5 L19,5 L19,8 Z M3,3 L11,3 L11,5 L5,5 L5,8 L3,8 L3,3 Z",
    HOME: "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    CARDS: "M20,2H8C6.9,2 6,2.9 6,4V16H20V4M20,18V20H4C2.9,20 2,19.1 2,18V6H4V18H20M8,4H20V16H8V4Z",
    FUSION: "M19,8H15V14H19M15,10H9V12H15M9,8H5V14H9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z",
    SWORD: "M6,2L2,6L6,10L10,6L6,2M6,16L2,20L6,24L10,20L6,16M20,6L16,2L12,6L16,10L20,6M16,16L12,20L16,24L20,20L16,16M9,12L12,9L15,12L12,15L9,12Z",
    FOOD: "M12,2C16,2 16,6 16,6C16,6 20,6 20,10C20,14 16,14 16,14C16,14 16,18 12,18C8,18 8,14 8,14C8,14 4,14 4,10C4,6 8,6 8,6C8,6 8,2 12,2Z",
    TRASH: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
    STAR: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z",
    CLOSE: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
    SHARE: "M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A4,4 0 0,0 22,4A4,4 0 0,0 18,0A4,4 0 0,0 14,4C14,4.24 14.04,4.47 14.09,4.7L7.04,8.81C6.5,8.31 5.79,8 5,8A4,4 0 0,0 1,12A4,4 0 0,0 5,16C5.79,16 6.5,15.69 7.04,15.19L14.16,19.32C14.1,19.54 14.07,19.77 14.07,20C14.07,22.21 15.86,24 18.07,24C20.28,24 22.07,22.21 22.07,20C22.07,17.79 20.28,16.08 18.07,16.08"
};

// --- COMPONENTS ---

const NeonIcon: React.FC<{ path: string, size?: number, className?: string }> = ({ path, size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`neon-svg ${className}`}>
        <path d={path} />
    </svg>
);

const BrandLogo: React.FC<{ className?: string, scale?: number }> = ({ className = "", scale = 1 }) => (
    <svg viewBox="0 0 400 120" className={`${className}`} style={{ width: 300 * scale, height: 90 * scale }} preserveAspectRatio="xMidYMid meet">
        <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FF69B4" />
                <stop offset="100%" stopColor="#FF007F" />
            </linearGradient>
            <filter id="dropShadow">
                 <feDropShadow dx="4" dy="4" stdDeviation="0" floodColor="black" />
            </filter>
        </defs>
        <g filter="url(#dropShadow)">
             <g className="animate-bounce" style={{animationDuration: '3s'}}>
                 {/* Cubes */}
                 <path d="M20,40 l15,-8 l15,8 l-15,8 z" fill="#00FFFF" stroke="black" strokeWidth="2"/>
                 <path d="M20,40 v15 l15,8 v-15 z" fill="#0088FF" stroke="black" strokeWidth="2"/>
                 <path d="M50,40 v15 l-15,8 v-15 z" fill="#0044CC" stroke="black" strokeWidth="2"/>
                 
                 <path d="M360,50 l12,-6 l12,6 l-12,6 z" fill="#00FF00" stroke="black" strokeWidth="2" transform="translate(0, -10)"/>
                 <path d="M360,50 v12 l12,6 v-12 z" fill="#008800" stroke="black" strokeWidth="2" transform="translate(0, -10)"/>
                 <path d="M384,50 v12 l-12,6 v-12 z" fill="#004400" stroke="black" strokeWidth="2" transform="translate(0, -10)"/>
             </g>

             <text x="50%" y="85" textAnchor="middle" 
                   fontFamily="Verdana, sans-serif" fontWeight="900" fontSize="80"
                   stroke="black" strokeWidth="16" strokeLinejoin="round" fill="none"
             >Pixupet</text>

             <text x="50%" y="85" textAnchor="middle" 
                   fontFamily="Verdana, sans-serif" fontWeight="900" fontSize="80"
                   fill="url(#logoGrad)"
             >Pixupet</text>
             
             <path d="M70 45 Q 120 35, 170 45 T 270 45" stroke="white" strokeWidth="4" strokeOpacity="0.5" fill="none" />
        </g>
    </svg>
);

const VoxelViewer = memo(({ code, onRef, className, mode = 'HABITAT', weather = 'CLEAR', time = 12, paused = false }: { code: string, onRef?: any, className?: string, mode?: 'HABITAT'|'BATTLE'|'BATTLE_LOCKED', weather?: WeatherType, time?: number, paused?: boolean }) => {
    const localRef = useRef<HTMLIFrameElement>(null);
    
    useEffect(() => {
        if (onRef) {
             if (typeof onRef === 'function') onRef(localRef.current);
             else onRef.current = localRef.current;
        }
    }, [onRef]);

    // Propagate updates to iframe
    useEffect(() => {
        const iframe = localRef.current;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'SET_MODE', value: mode }, '*');
            iframe.contentWindow.postMessage({ type: 'SET_WEATHER', value: weather }, '*');
            iframe.contentWindow.postMessage({ type: 'SET_TIME', value: time }, '*');
            iframe.contentWindow.postMessage({ type: 'PAUSE', value: paused }, '*');
        }
    }, [mode, weather, time, paused]);

    return (
        <iframe 
            ref={localRef}
            srcDoc={code} 
            className={`border-0 pointer-events-auto ${className || "w-full h-full"}`} 
            title="Pixupet View"
            style={{ background: 'transparent', width: '100%', height: '100%', colorScheme: 'normal' }} 
            allowTransparency={true}
            scrolling="no" 
            onLoad={(e) => {
                const iframe = e.currentTarget;
                setTimeout(() => {
                    iframe.contentWindow?.postMessage({ type: 'SET_MODE', value: mode }, '*');
                    if (mode === 'HABITAT') {
                         iframe.contentWindow?.postMessage({ type: 'CAMERA_MOVE', value: 'FOLLOW' }, '*');
                    }
                    iframe.contentWindow?.postMessage({ type: 'SET_WEATHER', value: weather }, '*');
                }, 500);
            }}
        />
    );
}, (prev, next) => prev.code === next.code && prev.mode === next.mode && prev.weather === next.weather && prev.time === next.time && prev.paused === next.paused);

const NavButton = ({ label, icon, onClick, active }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-16 rounded-xl border-2 border-black transition-all ${active ? 'bg-yellow-300 translate-y-1 shadow-none' : 'bg-white shadow-[4px_4px_0px_0px_black] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_black]'}`}
    >
        <NeonIcon path={icon} size={24} className="mb-1" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
    </button>
);

const StatBar = ({ label, value, max, color }: any) => (
    <div className="flex items-center gap-1 w-full font-bold text-[10px]">
        <span className="w-6 text-right uppercase tracking-tighter opacity-70">{label}</span>
        <div className="flex-1 h-3 border border-black rounded-full bg-white overflow-hidden relative">
            <div className={`h-full ${color} border-r border-black transition-all duration-500`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }}></div>
        </div>
    </div>
);

const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void, selected?: boolean, small?: boolean }> = ({ pet, onClick, selected, small }) => (
    <div onClick={onClick} className={`w-full aspect-[3/4.2] neo-card flex flex-col p-2 cursor-pointer relative bg-white ${selected ? 'ring-4 ring-yellow-400' : ''} ${!small && 'hover:scale-105'} transition-transform`}>
         <div className={`flex items-center justify-between px-2 py-1 rounded border-2 border-black ${ELEMENT_THEMES[pet.element]?.bg} ${ELEMENT_THEMES[pet.element]?.text} mb-2`}>
             <div className="flex items-center gap-1">
                 <span>{ELEMENT_THEMES[pet.element]?.icon}</span>
                 <span className="font-black uppercase text-[10px] truncate max-w-[80px]">{pet.name}</span>
             </div>
             <span className="font-black text-[10px]">Lv.{pet.level}</span>
         </div>
         <div className="flex-1 border-2 border-black rounded bg-gray-100 overflow-hidden relative mb-2">
             <img src={pet.cardArtUrl || pet.imageSource} className="w-full h-full object-cover" />
         </div>
         {!small && (
             <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1">
                 <StatBar label="HP" value={pet.currentHp || pet.hp} max={pet.maxHp || pet.hp} color="bg-green-400" />
                 <StatBar label="ATK" value={pet.atk} max={200} color="bg-red-400" />
             </div>
         )}
    </div>
);

// --- EVENT POPUP MODAL (SEAMLESS INTEGRATION) ---
const EventModal: React.FC<{ 
    event: RandomEvent, 
    onClose: () => void,
    playerPet: Pixupet
}> = ({ event, onClose, playerPet }) => {
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             {/* Dark Backdrop with Blur */}
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
             
             <div className="relative w-full max-w-lg bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-1 animate-pop-in rounded-2xl overflow-hidden">
                 {/* Header Strip */}
                 <div className={`w-full py-3 text-center border-b-4 border-black font-black text-xl tracking-widest ${event.type === 'WILD_BATTLE' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'}`}>
                     {event.type === 'WILD_BATTLE' ? '⚠️ WILD ENCOUNTER ⚠️' : '✨ DISCOVERY ✨'}
                 </div>

                 <div className="p-6 flex flex-col gap-4">
                     
                     {/* Battle Layout */}
                     {event.type === 'WILD_BATTLE' && (
                         <div className="flex items-center justify-between gap-4 mb-4">
                             <div className="w-1/3 transform translate-y-4">
                                 <PixuCard pet={playerPet} small />
                             </div>
                             <div className="text-center font-black text-4xl italic text-red-600">VS</div>
                             <div className="w-1/3 transform -translate-y-4">
                                 <PixuCard pet={event.data} small />
                             </div>
                         </div>
                     )}

                     {/* Loot Layout */}
                     {event.type === 'TREASURE' && (
                         <div className="flex flex-col items-center text-center py-8 animate-bounce">
                             <div className="text-6xl mb-4">🎁</div>
                             <div className="text-2xl font-black">YOU FOUND AN ITEM!</div>
                         </div>
                     )}

                     {/* Weather Change Layout */}
                     {event.type === 'WEATHER_CHANGE' && (
                         <div className="flex flex-col items-center text-center py-8">
                              <div className="text-6xl mb-4 animate-pulse">
                                  {event.data === 'RAIN' ? '🌧️' : event.data === 'STORM' ? '⛈️' : '☀️'}
                              </div>
                              <div className="text-2xl font-black uppercase">WEATHER SHIFT: {event.data}</div>
                         </div>
                     )}

                     {/* Action Log / Terminal */}
                     <div className="bg-black p-4 rounded-xl border-2 border-gray-700 h-32 overflow-y-auto font-mono text-xs text-green-400 shadow-inner">
                         {event.logs.map((log, i) => (
                             <div key={i} className="mb-1">> {log}</div>
                         ))}
                         {event.step === 'ACTION' && <div className="animate-pulse">> PROCESSING...</div>}
                     </div>
                     
                     {/* Result & Close */}
                     {event.step === 'RESULT' && (
                         <div className="animate-pop-in mt-2">
                             {event.reward && (
                                 <div className="bg-yellow-100 border-2 border-black p-2 text-center font-bold mb-4 text-sm rounded">
                                     REWARD: {event.reward}
                                 </div>
                             )}
                             <button onClick={onClose} className="w-full neo-btn bg-cyan-300 py-4 text-lg hover:bg-cyan-200">
                                 {event.winner === 'ENEMY' ? 'RETREAT...' : 'CONTINUE EXPLORATION'}
                             </button>
                         </div>
                     )}
                 </div>
             </div>
        </div>
    );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  const [playerPet, setPlayerPet] = useState<Pixupet | null>(null);
  const [enemyPet, setEnemyPet] = useState<Pixupet | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>(SCAN_PHRASES[0]);
  const [hasGlitch, setHasGlitch] = useState(false);
  const [fusionSlots, setFusionSlots] = useState<{a: Pixupet | null, b: Pixupet | null}>({a: null, b: null});
  const [isFusionSelecting, setIsFusionSelecting] = useState<'a'|'b'|null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoLootMsg, setAutoLootMsg] = useState<string | null>(null);
  const [inspectingPet, setInspectingPet] = useState<Pixupet | null>(null);
  const [weather, setWeather] = useState<WeatherType>('CLEAR');
  const [gameHour, setGameHour] = useState(12); // 0-24
  const [screenShake, setScreenShake] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const battlePlayerRef = useRef<HTMLIFrameElement | null>(null);
  const battleEnemyRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
      try {
          const savedUser = localStorage.getItem('pixupet_user_v1');
          const savedInv = localStorage.getItem('pixupet_inventory_v1');
          if (savedUser) setUser(JSON.parse(savedUser));
          if (savedInv) setInventory(JSON.parse(savedInv));
          
          if (savedUser) {
            setGameState('NEXUS'); 
          }
      } catch(e) { console.error("Save Corrupt", e); }
  }, []);
  
  // Real-time Weather Loop
  useEffect(() => {
      const fetchWeather = () => {
          if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(async (pos) => {
                  try {
                      const { latitude, longitude } = pos.coords;
                      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code`);
                      const data = await res.json();
                      const code = data.current?.weather_code;
                      
                      let newWeather: WeatherType = 'CLEAR';
                      if (code >= 51 && code <= 67) newWeather = 'RAIN';
                      else if (code >= 80 && code <= 82) newWeather = 'RAIN';
                      else if (code >= 95) newWeather = 'STORM';
                      else if (code >= 45 && code <= 48) newWeather = 'NEON_MIST';
                      else if (code === 0 || code === 1) newWeather = 'CLEAR';
                      
                      if (newWeather !== weather) {
                         // Trigger weather change event if in game
                         if (gameState === 'NEXUS' && !activeEvent) {
                             triggerEvent('WEATHER_CHANGE', newWeather);
                         }
                         setWeather(newWeather);
                      }
                  } catch(e) {
                      console.warn("Weather fetch failed");
                  }
              });
          }
      };
      
      fetchWeather();
      const weatherInterval = setInterval(fetchWeather, 60000 * 10); // Check every 10 mins

      const t = setInterval(() => {
          const now = new Date();
          setCurrentTime(now);
          setGameHour(now.getHours()); 
      }, 1000);
      
      return () => { clearInterval(t); clearInterval(weatherInterval); };
  }, [weather, gameState, activeEvent]);

  const saveGame = (u?: UserProfile, i?: Pixupet[]) => {
      if (u) { setUser(u); localStorage.setItem('pixupet_user_v1', JSON.stringify(u)); }
      if (i) { setInventory(i); localStorage.setItem('pixupet_inventory_v1', JSON.stringify(i)); }
  };

  const spawnFloatText = (text: string, color: string) => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, text, x: 50 + (Math.random()-0.5)*20, y: 40, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  const triggerShake = () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
  };

  // HANDLE PET SWITCHING
  const handleSetAsActive = (pet: Pixupet) => {
      if (pet.id === inventory[0].id) return; // Already active
      const otherPets = inventory.filter(p => p.id !== pet.id);
      const newInv = [pet, ...otherPets];
      setInventory(newInv);
      saveGame(user!, newInv);
      setInspectingPet(null);
      setGameState('NEXUS');
  };

  // HANDLE TACTIC CHANGE
  const handleUpdateTactic = (id: string, tactic: AITactic) => {
      const newInv = inventory.map(p => p.id === id ? { ...p, tactic } : p);
      setInventory(newInv);
      saveGame(user!, newInv);
      if (inspectingPet && inspectingPet.id === id) {
          setInspectingPet({ ...inspectingPet, tactic });
      }
  };

  // GENERIC EVENT TRIGGER
  const triggerEvent = (type: EventType, data?: any) => {
      if (activeEvent) return; // Block if busy
      
      triggerShake();
      
      // 1. Initialize Event State
      let initialData = data;
      if (type === 'WILD_BATTLE' && !data) {
           const enemy = getRandomEnemy(user?.currentRank || 'E', inventory[0].level);
           // Stat Adjustment for Quick Auto-Battles
           enemy.hp = Math.floor(enemy.hp * 0.6); 
           initialData = enemy;
      }

      const newEvent: RandomEvent = {
          type,
          data: initialData,
          step: 'INTRO',
          logs: type === 'WILD_BATTLE' ? [`A wild ${initialData.name} appeared!`] : ['Something glimmers nearby...']
      };
      
      setActiveEvent(newEvent);

      // 2. Start Async Logic after short delay for UI enter
      setTimeout(() => {
          if (type === 'WILD_BATTLE') {
              resolveAutoBattle(newEvent, inventory[0]);
          } else if (type === 'TREASURE') {
              resolveTreasure(newEvent);
          } else if (type === 'WEATHER_CHANGE') {
              setActiveEvent(prev => prev ? { ...prev, step: 'RESULT', logs: [...prev.logs, `Environment shifted to ${data}.`] } : null);
          }
      }, 1500);
  };

  const resolveTreasure = (event: RandomEvent) => {
      const foundCoins = Math.floor(Math.random() * 50) + 10;
      const updatedUser = { ...user!, coins: user!.coins + foundCoins };
      saveGame(updatedUser);
      
      setActiveEvent(prev => prev ? {
          ...prev,
          step: 'RESULT',
          reward: `${foundCoins} Coins`,
          logs: [...prev.logs, `You found a stash of coins!`, `+${foundCoins} Gold added.`]
      } : null);
  };

  const resolveAutoBattle = (event: RandomEvent, player: Pixupet) => {
      setActiveEvent(prev => prev ? { ...prev, step: 'ACTION' } : null);
      
      const enemy = event.data as Pixupet;
      let pHp = player.currentHp || player.hp;
      let eHp = enemy.hp;
      const logs: string[] = [...event.logs];

      // Simulate Turns (Simplified for AFK)
      const battleLoop = setInterval(() => {
          // Player Turn
          const pDmg = Math.max(5, Math.floor((player.atk * 0.5) - (enemy.def * 0.1)));
          eHp -= pDmg;
          logs.push(`${player.name} hits for ${pDmg} dmg!`);
          
          if (eHp <= 0) {
              clearInterval(battleLoop);
              // Win Logic
              const xp = 30;
              const coins = 20;
              const updatedPet = { ...player, exp: player.exp + xp, currentHp: pHp };
              // Level Up Check
              if (updatedPet.exp >= updatedPet.maxExp) {
                   updatedPet.level++;
                   updatedPet.exp = 0;
                   updatedPet.maxExp = Math.floor(updatedPet.maxExp * 1.2);
                   updatedPet.atk += 5; updatedPet.maxHp! += 10; updatedPet.hp += 10; updatedPet.currentHp = updatedPet.maxHp;
                   logs.push("LEVEL UP!");
              }

              const newInv = [updatedPet, ...inventory.slice(1)];
              const newUser = { ...user!, coins: user!.coins + coins, battlesWon: (user!.battlesWon||0) + 1 };
              saveGame(newUser, newInv);
              
              setActiveEvent(prev => prev ? {
                  ...prev,
                  step: 'RESULT',
                  winner: 'PLAYER',
                  reward: `+${xp} XP | +${coins} Coins`,
                  logs: [...logs, `Enemy ${enemy.name} defeated!`]
              } : null);
              return;
          }

          // Enemy Turn
          const eDmg = Math.max(2, Math.floor((enemy.atk * 0.4) - (player.def * 0.1)));
          pHp -= eDmg;
          logs.push(`Enemy hits back for ${eDmg} dmg!`);

          if (pHp <= 0) {
              clearInterval(battleLoop);
              // Loss Logic
              const updatedPet = { ...player, currentHp: 0 };
              const newInv = [updatedPet, ...inventory.slice(1)];
              saveGame(user!, newInv);

              setActiveEvent(prev => prev ? {
                  ...prev,
                  step: 'RESULT',
                  winner: 'ENEMY',
                  logs: [...logs, `${player.name} fainted...`]
              } : null);
              return;
          }

          // Update Logs UI
          setActiveEvent(prev => prev ? { ...prev, logs: [...logs] } : null);

      }, 800); // Turn Speed
  };

  // AFK Loop for Triggering Events
  useEffect(() => {
      const loop = setInterval(() => {
          if (gameState === 'NEXUS' && inventory.length > 0 && !activeEvent) {
              // 2% chance per check
              if (Math.random() < 0.02) {
                  const rand = Math.random();
                  if (rand < 0.7) triggerEvent('WILD_BATTLE');
                  else triggerEvent('TREASURE');
              }
              
              // Glitch chance
              if (!hasGlitch && Math.random() < 0.01) {
                  setHasGlitch(true);
                  iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_DIRT', value: true }, '*');
              }
          }
      }, 2000);
      return () => clearInterval(loop);
  }, [gameState, inventory, activeEvent, hasGlitch]);

  // ... handleScan, handleCreateProfile, etc ... (Kept largely same, just updated logic where needed)
  
  const handleScan = async (img: string) => {
      setGameState('SCAN');
      try {
          const stats = await analyzeObject(img);
          let code = await generateVoxelScene(img, stats.visual_design, stats.bodyType);
          code = makeBackgroundTransparent(zoomCamera(hideBodyText(code), 1.0));
          let art = img;
          generateCardArt(stats.description, stats.name, stats.visual_design)
              .then(url => {
                  setInventory(prev => prev.map(p => p.id === newPet.id ? {...p, cardArtUrl: url} : p));
              }).catch(console.error);
          const newPet: Pixupet = {
              ...stats, voxelCode: code, imageSource: img, cardArtUrl: art,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0, tactic: 'BALANCED'
          };
          const newInv = [newPet, ...inventory];
          saveGame(user!, newInv);
          setGameState('NEXUS');
      } catch (e) {
          alert("Scan Failed. Try a clear image.");
          setGameState('NEXUS');
      }
  };

  const handleCreateProfile = () => {
      const u: UserProfile = { name: 'Tamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: [] };
      saveGame(u, []);
      setGameState('NEXUS');
  };

  const startArenaBattle = () => {
      const pet = inventory[0];
      if (!pet) return;
      if ((pet.currentHp || 0) <= 0) {
          alert("Your partner is too weak! Heal them first.");
          return;
      }
      const updatedPet = { ...pet, hunger: Math.max(0, pet.hunger - 10) };
      const newInv = inventory.map(p => p.id === pet.id ? updatedPet : p);
      saveGame(user!, newInv);
      const enemy = getRandomEnemy(user?.currentRank || 'E', pet.level);
      const enemyVoxel = getGenericVoxel(enemy.element);
      setPlayerPet(updatedPet);
      setEnemyPet({ ...enemy, voxelCode: enemyVoxel });
      setIsBattleOver(false);
      setBattleLog(["BATTLE START!"]);
      setGameState('ARENA');
  };

  // ... render logic ...

  if (gameState === 'SPLASH') {
      return (
          <div className="w-full h-screen bg-yellow-300 flex items-center justify-center p-4">
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-8 text-center animate-pop-in flex flex-col items-center">
                  <BrandLogo scale={1.5} className="mb-8" />
                  <p className="font-bold mb-8 bg-black text-white inline-block px-2 py-1">GOD-TIER UPDATE</p>
                  <button onClick={handleCreateProfile} className="neo-btn bg-cyan-300 w-full py-4 text-xl hover:bg-cyan-200">START GAME</button>
              </div>
          </div>
      );
  }

  if (gameState === 'SCAN') {
      return (
          <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
              <BrandLogo className="mb-12" />
              <div className="w-24 h-24 border-8 border-t-transparent border-cyan-400 rounded-full animate-spin mb-8 shadow-[0_0_20px_cyan]"></div>
              <h2 className="text-2xl font-mono animate-pulse text-center px-4">{scanMessage}</h2>
          </div>
      );
  }

  if (gameState === 'INVENTORY') {
      return (
          <div className="w-full h-screen bg-gray-100 p-4 flex flex-col">
              <div className="flex justify-between mb-4">
                  <h2 className="text-3xl font-black">INVENTORY</h2>
                  <button onClick={() => setGameState(isFusionSelecting ? 'SYNTHESIS' : 'NEXUS')} className="neo-btn bg-white px-4">CLOSE</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
                  {inventory.map(pet => (
                      <PixuCard 
                        key={pet.id} 
                        pet={pet} 
                        selected={pet.id === inventory[0].id}
                        onClick={() => {
                            if (isFusionSelecting) {
                                setFusionSlots(prev => ({ ...prev, [isFusionSelecting]: pet }));
                                setIsFusionSelecting(null);
                                setGameState('SYNTHESIS');
                            } else {
                                // setInspectingPet(pet); 
                                // Simplified for this update to just select
                                handleSetAsActive(pet);
                            }
                        }} 
                      />
                  ))}
              </div>
          </div>
      );
  }

  if (gameState === 'SYNTHESIS') {
       // ... existing synthesis render ...
      return (
          <div className="w-full h-screen bg-purple-100 flex flex-col items-center justify-center p-4">
              <h2 className="text-4xl font-black mb-8">FUSION LAB</h2>
              <div className="flex gap-4 mb-8 w-full max-w-md justify-center">
                  {['a', 'b'].map(slot => (
                      <div key={slot} onClick={() => { setIsFusionSelecting(slot as 'a'|'b'); setGameState('INVENTORY'); }} 
                           className="w-32 h-48 border-4 border-dashed border-black bg-white/50 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-white transition-colors">
                          {fusionSlots[slot as 'a'|'b'] ? (
                              <img src={fusionSlots[slot as 'a'|'b']!.imageSource} className="w-full h-full object-cover" />
                          ) : <span className="font-bold opacity-50">SELECT {slot.toUpperCase()}</span>}
                      </div>
                  ))}
              </div>
              <button 
                disabled={!fusionSlots.a || !fusionSlots.b}
                onClick={async () => {
                    setGameState('SCAN');
                    try {
                        const res = await fuseVoxelScene(fusionSlots.a!, fusionSlots.b!);
                        const newPet: Pixupet = { ...fusionSlots.a!, ...res, id: Math.random().toString(), voxelCode: makeBackgroundTransparent(res.code) };
                        const newInv = [newPet, ...inventory];
                        saveGame(user!, newInv);
                        setGameState('NEXUS');
                    } catch(e) { setGameState('NEXUS'); }
                }}
                className="neo-btn bg-purple-500 text-white px-8 py-4 w-full max-w-md disabled:opacity-50 hover:bg-purple-400"
              >INITIATE FUSION</button>
              <button onClick={() => setGameState('NEXUS')} className="mt-4 font-bold underline">CANCEL</button>
          </div>
      );
  }

  if (gameState === 'ARENA') {
       // ... existing arena render ...
      return (
          <div className={`w-full h-screen bg-gray-900 flex flex-col relative overflow-hidden ${screenShake ? 'shake' : ''}`}>
              <div className="absolute inset-0 flex flex-col md:flex-row">
                  <div className="relative flex-1 border-b-4 md:border-r-4 border-black bg-gray-800">
                       {playerPet && <VoxelViewer code={playerPet.voxelCode} onRef={ref => battlePlayerRef.current = ref} mode="BATTLE" />}
                       <div className="absolute bottom-4 left-4 bg-white border-2 border-black p-2 rounded shadow-[4px_4px_0px_0px_black] z-10">
                           <div className="font-black">{playerPet?.name}</div>
                           <div className="w-40 h-4 bg-gray-300 rounded-full overflow-hidden border border-black mt-1"><div className="h-full bg-green-500 transition-all duration-500" style={{width: `${(playerPet?.currentHp!/playerPet?.maxHp!)*100}%`}}></div></div>
                       </div>
                  </div>
                  <div className="relative flex-1 bg-gray-800">
                       {enemyPet && <VoxelViewer code={enemyPet.voxelCode} onRef={ref => battleEnemyRef.current = ref} mode="BATTLE" />}
                       <div className="absolute top-4 right-4 bg-white border-2 border-black p-2 rounded shadow-[4px_4px_0px_0px_black] z-10">
                           <div className="font-black text-right">{enemyPet?.name}</div>
                           <div className="w-40 h-4 bg-gray-300 rounded-full overflow-hidden border border-black mt-1"><div className="h-full bg-red-500 transition-all duration-500" style={{width: `${(enemyPet?.currentHp!/enemyPet?.maxHp!)*100}%`}}></div></div>
                       </div>
                  </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-6 text-center font-bold border-t-4 border-white z-20">
                  {isBattleOver ? (
                      <div className="animate-pop-in">
                          <div className="text-4xl text-yellow-400 mb-4 font-black">{playerPet?.currentHp! > 0 ? "VICTORY!" : "DEFEATED..."}</div>
                          <button onClick={() => setGameState('NEXUS')} className="neo-btn bg-white text-black px-8 py-3 text-xl hover:bg-gray-200">RETURN TO NEXUS</button>
                      </div>
                  ) : (
                      <div className="text-xl md:text-2xl">{battleLog[0]}</div>
                  )}
              </div>
          </div>
      );
  }

  const activePet = inventory[0];

  return (
      <div className={`w-full h-screen relative overflow-hidden flex flex-col ${activePet ? HABITAT_PATTERNS[activePet.element] || 'bg-gray-100' : 'bg-gray-100'} ${screenShake ? 'shake' : ''}`}>
          {!activePet ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                 <BrandLogo className="mb-8" />
                 <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_black] max-w-sm">
                     <p className="mb-8 font-bold text-xl">Scan any real-world object to generate your first partner!</p>
                     <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-black rounded-full flex items-center justify-center text-yellow-400 border-4 border-yellow-400 hover:scale-110 transition-transform mx-auto shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                         <NeonIcon path={ICONS.SCAN} size={48} />
                     </button>
                 </div>
             </div>
          ) : (
             <>
                {/* LAYER 0: 3D WORLD (PAUSES ON EVENT) */}
                <div className={`absolute inset-0 z-0 w-full h-full transition-opacity duration-500 ${activeEvent ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                    <VoxelViewer 
                        code={activePet.voxelCode} 
                        onRef={ref => iframeRef.current = ref} 
                        mode={'HABITAT'} 
                        weather={weather} 
                        time={gameHour} 
                        paused={!!activeEvent} // PAUSE RENDERING LOOP
                    />
                </div>

                {/* LAYER 1: UI OVERLAYS */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {floatingTexts.map(ft => (
                        <div key={ft.id} className={`absolute font-black text-2xl stroke-black ${ft.color} animate-float-up`} style={{ left: `${ft.x}%`, top: `${ft.y}%`, textShadow: '2px 2px 0 #000' }}>{ft.text}</div>
                    ))}
                </div>
                
                {/* MODAL LAYER: EVENTS */}
                {activeEvent && (
                    <EventModal 
                        event={activeEvent} 
                        onClose={() => { setActiveEvent(null); setGameState('NEXUS'); }} 
                        playerPet={activePet}
                    />
                )}

                {/* HUD */}
                <div className="absolute top-0 left-0 right-0 p-4 z-20 pointer-events-none flex justify-between items-start">
                    <div className="bg-white border-2 border-black px-4 py-2 rounded-full shadow-[4px_4px_0px_0px_black] pointer-events-auto flex gap-4 items-center">
                        <div>
                            <div className="font-black text-lg">{activePet.name}</div>
                            <div className="text-xs font-bold text-gray-500 flex gap-2">
                                <span>LVL {activePet.level}</span>
                                <span className={activePet.currentHp! < activePet.maxHp! * 0.3 ? "text-red-500 blink" : "text-green-500"}>HP {activePet.currentHp}/{activePet.maxHp}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pointer-events-auto items-start">
                        <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-xs border-2 border-white">{weather}</div>
                        {hasGlitch && (
                            <button onClick={() => { setHasGlitch(false); iframeRef.current?.contentWindow?.postMessage({type:'TOGGLE_DIRT', value:false}, '*'); }} className="neo-btn bg-red-500 text-white p-3 rounded-full animate-bounce shadow-lg"><NeonIcon path={ICONS.TRASH} /></button>
                        )}
                        <div className="bg-white border-2 border-black px-4 py-2 rounded-full font-black flex flex-col items-end shadow-[4px_4px_0px_0px_black]">
                            <span>💰 {user?.coins}</span>
                            <span className="text-[10px] text-gray-500">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-30 pointer-events-none">
                     <div className="flex justify-center relative top-8 pointer-events-auto mb-4">
                            <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-black rounded-full text-yellow-400 border-4 border-yellow-400 flex items-center justify-center hover:scale-110 shadow-[0px_10px_20px_rgba(0,0,0,0.3)] transition-transform">
                                <NeonIcon path={ICONS.SCAN} size={48} />
                            </button>
                    </div>
                    <div className="bg-white border-t-4 border-x-4 border-black rounded-t-3xl p-4 grid grid-cols-3 gap-4 shadow-[0px_-10px_0px_0px_rgba(0,0,0,0.1)] pointer-events-auto">
                        <NavButton label="BATTLE ARENA" icon={ICONS.SWORD} onClick={startArenaBattle} />
                        <NavButton label="COLLECTION" icon={ICONS.CARDS} onClick={() => setGameState('INVENTORY')} />
                        <NavButton label="FUSION LAB" icon={ICONS.FUSION} onClick={() => setGameState('SYNTHESIS')} />
                    </div>
                </div>
             </>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
               if(e.target.files?.[0]) {
                   const r = new FileReader();
                   r.onload = (ev) => { if(typeof ev.target?.result === 'string') handleScan(ev.target.result); };
                   r.readAsDataURL(e.target.files[0]);
                   e.target.value = '';
               }
          }} />
      </div>
  );
};

export default App;
