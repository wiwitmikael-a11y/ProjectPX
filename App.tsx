
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { generateVoxelScene, analyzeObject, MonsterStats, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, AITactic, WeatherType, calculateOfflineProgress, OfflineReport, getProceduralMonsterArt, EVO_THRESHOLDS, MonsterStage, determineEvolutionPath } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'NEXUS' | 'SCAN' | 'INVENTORY' | 'ARENA' | 'SYNTHESIS' | 'TRAINING' | 'SHOP' | 'ERROR';
type EventType = 'WILD_BATTLE' | 'TREASURE' | 'WEATHER_CHANGE' | 'MERCHANT' | 'MYSTERY_SIGNAL';
type BattleCommand = 'ATTACK' | 'DEFEND' | 'CHARGE' | 'HEAL';

const SAVE_VERSION = 'v3.0_PROTOCOLS'; // Version Bump for New Stage System

interface UserProfile {
  name: string;
  level: number;
  exp: number;
  coins: number; 
  joinedAt: number;
  lastSaveAt: number; 
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
  happiness?: number; 
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
    data: any; 
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
    TRAIN: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6V12L16.24,16.24L14.83,17.66L9,11.83V6H12Z",
    SHOP: "M4,4H20V6H4V4M4,9H20V19H4V9M6,12V16H8V12H6M10,12V16H12V12H10M14,12V16H16V12H14M2,2V22H22V2H2Z"
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
             <text x="50%" y="85" textAnchor="middle" 
                   fontFamily="Verdana, sans-serif" fontWeight="900" fontSize="80"
                   stroke="black" strokeWidth="16" strokeLinejoin="round" fill="none"
             >Pixupet</text>

             <text x="50%" y="85" textAnchor="middle" 
                   fontFamily="Verdana, sans-serif" fontWeight="900" fontSize="80"
                   fill="url(#logoGrad)"
             >Pixupet</text>
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

const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void, selected?: boolean, small?: boolean, onEvolve?: () => void }> = ({ pet, onClick, selected, small, onEvolve }) => {
    
    // Evolution Eligibility Check & Normalize old save data stages
    let canEvolve = false;
    let nextStage = '';
    const stage = pet.stage as string;

    if ((stage === 'Spark' || stage === 'Rookie') && pet.level >= EVO_THRESHOLDS.SURGE) { canEvolve = true; nextStage = 'Surge'; }
    else if ((stage === 'Surge' || stage === 'Champion') && pet.level >= EVO_THRESHOLDS.TURBO) { canEvolve = true; nextStage = 'Turbo'; }
    else if ((stage === 'Turbo' || stage === 'Ultimate') && pet.level >= EVO_THRESHOLDS.NOVA) { canEvolve = true; nextStage = 'Nova'; }

    // Predict Evolution Path for UI hint
    const { protocolName, alignment } = determineEvolutionPath({ atk: pet.atk, def: pet.def, spd: pet.spd, happiness: pet.happiness || 50 });
    
    // Dynamic Path Color
    let protocolColor = "text-gray-500";
    if (protocolName.includes('Crimson')) protocolColor = "text-red-500";
    if (protocolName.includes('Azure')) protocolColor = "text-blue-500";
    if (protocolName.includes('Titanium')) protocolColor = "text-gray-700";
    
    return (
    <div onClick={onClick} className={`w-full aspect-[3/4.2] neo-card flex flex-col p-2 cursor-pointer relative bg-white ${selected ? 'ring-4 ring-yellow-400' : ''} ${!small && 'hover:scale-105'} transition-transform`}>
         <div className={`flex items-center justify-between px-2 py-1 rounded border-2 border-black ${ELEMENT_THEMES[pet.element]?.bg} ${ELEMENT_THEMES[pet.element]?.text} mb-2`}>
             <div className="flex items-center gap-1">
                 <span>{ELEMENT_THEMES[pet.element]?.icon}</span>
                 <div className="flex flex-col leading-none">
                    <span className="font-black uppercase text-[10px] truncate max-w-[80px]">{pet.name}</span>
                    <span className="text-[8px] opacity-80">{pet.stage}</span>
                 </div>
             </div>
             <span className="font-black text-[10px]">Lv.{pet.level}</span>
         </div>
         <div className="flex-1 border-2 border-black rounded bg-gray-100 overflow-hidden relative mb-2 group">
             <img src={pet.cardArtUrl || pet.imageSource} className="w-full h-full object-cover" style={{imageRendering: 'pixelated'}} />
             
             {/* Evolution Hint Overlay */}
             {!small && !canEvolve && pet.stage !== 'Nova' && (
                 <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[8px] p-1 text-center backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform">
                     Path: <span className={`font-bold ${protocolColor}`}>{protocolName}</span>
                     {alignment === 'CORRUPTED' && <span className="text-red-500 animate-pulse block">⚠️ UNSTABLE</span>}
                 </div>
             )}
         </div>
         {!small && (
             <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1">
                 <StatBar label="HP" value={pet.currentHp || pet.hp} max={pet.maxHp || pet.hp} color="bg-green-400" />
                 <StatBar label="ATK" value={pet.atk} max={200} color="bg-red-400" />
             </div>
         )}
         {onEvolve && canEvolve && (
             <button onClick={(e) => { e.stopPropagation(); onEvolve(); }} className="absolute bottom-2 right-2 bg-cyan-400 border-2 border-black text-xs font-black px-2 py-1 rounded hover:bg-cyan-300 animate-pulse shadow-[2px_2px_0px_0px_black]">
                 INITIALIZE {nextStage.toUpperCase()}!
             </button>
         )}
    </div>
    );
};

// --- MODALS ---
const WelcomeModal: React.FC<{ report: OfflineReport, onClose: () => void }> = ({ report, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
         <div className="relative w-full max-w-md bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-1 animate-pop-in rounded-2xl overflow-hidden">
             <div className="bg-cyan-400 border-b-4 border-black py-4 text-center">
                 <h2 className="text-2xl font-black tracking-wider">SYSTEM RESUMED</h2>
             </div>
             <div className="p-6 text-center">
                 <div className="mb-4 font-mono text-sm text-gray-600">
                     Sleep Mode Duration: <span className="font-bold text-black">{(report.secondsAway / 60).toFixed(0)} mins</span>.
                 </div>
                 <div className="bg-gray-100 border-2 border-black p-4 rounded-xl mb-4 grid grid-cols-2 gap-4">
                     <div><div className="text-xs uppercase font-bold text-gray-500">XP Synced</div><div className="text-2xl font-black text-green-600">+{report.xpGained}</div></div>
                     <div><div className="text-xs uppercase font-bold text-gray-500">Coins Mined</div><div className="text-2xl font-black text-yellow-600">+{report.coinsFound}</div></div>
                     <div><div className="text-xs uppercase font-bold text-gray-500">Energy Drain</div><div className="text-2xl font-black text-red-600">-{report.hungerLost}</div></div>
                 </div>
                 <div className="bg-black text-green-400 p-3 rounded font-mono text-xs text-left h-24 overflow-y-auto mb-4">
                     {report.events.map((e, i) => <div key={i}>> {e}</div>)}
                 </div>
                 <button onClick={onClose} className="neo-btn bg-yellow-400 w-full py-3 text-lg hover:bg-yellow-300">BOOT SYSTEM</button>
             </div>
         </div>
    </div>
);

const EventModal: React.FC<{ event: RandomEvent, onClose: () => void, playerPet: Pixupet }> = ({ event, onClose, playerPet }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
             <div className="relative w-full max-w-lg bg-white border-4 border-black shadow-[12px_12px_0px_0px_black] p-1 animate-pop-in rounded-2xl overflow-hidden">
                 <div className={`w-full py-3 text-center border-b-4 border-black font-black text-xl tracking-widest ${event.type === 'WILD_BATTLE' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'}`}>
                     {event.type === 'WILD_BATTLE' ? '⚠️ GLITCH DETECTED ⚠️' : event.type === 'TREASURE' ? '✨ DATA CACHE ✨' : '📫 EVENT'}
                 </div>

                 <div className="p-6 flex flex-col gap-4">
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

                     {event.type === 'TREASURE' && (
                         <div className="flex flex-col items-center text-center py-8 animate-bounce">
                             <div className="text-6xl mb-4">🎁</div>
                             <div className="text-2xl font-black">DECRYPTED ITEM!</div>
                         </div>
                     )}
                     
                     {event.type === 'MERCHANT' && (
                         <div className="flex flex-col items-center text-center py-8">
                             <div className="text-6xl mb-4">🛒</div>
                             <div className="text-2xl font-black">DARK NET MERCHANT</div>
                             <p>He offers you a deal...</p>
                         </div>
                     )}

                     <div className="bg-black p-4 rounded-xl border-2 border-gray-700 h-32 overflow-y-auto font-mono text-xs text-green-400 shadow-inner">
                         {event.logs.map((log, i) => <div key={i}>> {log}</div>)}
                         {event.step === 'ACTION' && <div className="animate-pulse">> EXECUTING BATTLE PROTOCOL...</div>}
                     </div>
                     
                     {event.step === 'RESULT' && (
                         <div className="animate-pop-in mt-2">
                             {event.reward && (
                                 <div className="bg-yellow-100 border-2 border-black p-2 text-center font-bold mb-4 text-sm rounded">
                                     REWARD: {event.reward}
                                 </div>
                             )}
                             <button onClick={onClose} className="w-full neo-btn bg-cyan-300 py-4 text-lg hover:bg-cyan-200">
                                 {event.winner === 'ENEMY' ? 'EMERGENCY EXIT' : 'CONFIRM'}
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
  const [fusionSlots, setFusionSlots] = useState<{a: Pixupet | null, b: Pixupet | null}>({a: null, b: null});
  const [isFusionSelecting, setIsFusionSelecting] = useState<'a'|'b'|null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherType>('CLEAR');
  const [gameHour, setGameHour] = useState(12); 
  const [screenShake, setScreenShake] = useState(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  const [trainingStat, setTrainingStat] = useState<'atk'|'def'|'spd'|null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  
  // Battle Tactics
  const [battleCommand, setBattleCommand] = useState<BattleCommand | null>(null);
  const [playerCharged, setPlayerCharged] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const battlePlayerRef = useRef<HTMLIFrameElement | null>(null);
  const battleEnemyRef = useRef<HTMLIFrameElement | null>(null);

  // --- LOAD & RESET LOGIC ---
  useEffect(() => {
      try {
          const currentVersion = localStorage.getItem('pixupet_version');
          // Soft migration: If version mismatch, we might wipe OR try to adapt. 
          // For this update, we wipe to ensure Clean Slate for the Evolution Protocol.
          if (currentVersion !== SAVE_VERSION) {
              localStorage.clear();
              localStorage.setItem('pixupet_version', SAVE_VERSION);
              console.log("System Update. Data Reset.");
          } else {
              const savedUser = localStorage.getItem('pixupet_user_v1');
              const savedInv = localStorage.getItem('pixupet_inventory_v1');
              if (savedUser && savedInv) {
                  const u = JSON.parse(savedUser);
                  const inv = JSON.parse(savedInv);
                  
                  if (u.lastSaveAt && inv.length > 0) {
                      const report = calculateOfflineProgress(inv[0], u.lastSaveAt);
                      inv[0].exp += report.xpGained;
                      if (inv[0].exp >= inv[0].maxExp) {
                          inv[0].level++;
                          inv[0].exp = 0;
                          inv[0].maxExp = Math.floor(inv[0].maxExp * 1.2);
                          inv[0].atk += 2; inv[0].maxHp! += 5; inv[0].hp += 5;
                      }
                      u.coins += report.coinsFound;
                      setOfflineReport(report);
                  }
                  
                  setUser(u);
                  setInventory(inv);
                  setGameState('NEXUS'); 
              }
          }
      } catch(e) { console.error("Save Corrupt", e); }
  }, []);

  // SAVE LOOP
  useEffect(() => {
      const interval = setInterval(() => {
          if (user && inventory.length > 0) {
              saveGame(user, inventory);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [user, inventory]);
  
  // WEATHER
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
                      
                      if (newWeather !== weather) setWeather(newWeather);
                  } catch(e) {}
              });
          }
      };
      fetchWeather();
      const t = setInterval(() => {
          const now = new Date();
          setCurrentTime(now);
          setGameHour(now.getHours()); 
      }, 1000);
      return () => { clearInterval(t); };
  }, [weather]);

  // --- BATTLE ARENA LOGIC (TACTICAL) ---
  useEffect(() => {
      let arenaInterval: any;
      
      // Only run the loop if we have a command OR if we are waiting for animation
      if (gameState === 'ARENA' && !isBattleOver && playerPet && enemyPet && battleCommand) {
          
          // Execute Turn immediately upon command
          const executeTurn = () => {
              // 1. Player Turn
              let pDmg = 0;
              let logMsg = "";
              let isDefending = false;

              if (battleCommand === 'ATTACK') {
                  pDmg = Math.max(5, Math.floor((playerPet.atk * 0.5) - (enemyPet.def * 0.1)));
                  const pCrit = Math.random() < (playerPet.happiness || 50) / 500;
                  if (pCrit) { pDmg = Math.floor(pDmg * 1.5); logMsg = "CRITICAL HIT! "; }
                  if (playerCharged) { pDmg *= 2; logMsg += "SUPER CHARGED! "; setPlayerCharged(false); }
                  logMsg += `${playerPet.name} attacks!`;
              } else if (battleCommand === 'DEFEND') {
                  isDefending = true;
                  logMsg = `${playerPet.name} is bracing!`;
              } else if (battleCommand === 'CHARGE') {
                  setPlayerCharged(true);
                  logMsg = `${playerPet.name} is charging power!`;
              }

              setBattleLog(prev => [logMsg, ...prev]);
              
              if (pDmg > 0) {
                  const newEnemyHp = Math.max(0, (enemyPet.currentHp || enemyPet.hp) - pDmg);
                  setEnemyPet(prev => prev ? ({...prev, currentHp: newEnemyHp}) : null);
                  triggerShake();
                  setBattleLog(prev => [`> Dealt ${pDmg} damage!`, ...prev]);
                  
                  if (newEnemyHp <= 0) {
                      setIsBattleOver(true);
                      setBattleLog(prev => ["ENEMY DEFEATED!", ...prev]);
                      const xp = 50;
                      const coins = 50;
                      const updatedPlayer = { ...playerPet, exp: playerPet.exp + xp, battlesWon: (user?.battlesWon||0) + 1 };
                      if (updatedPlayer.exp >= updatedPlayer.maxExp) {
                           updatedPlayer.level++;
                           updatedPlayer.exp = 0;
                           updatedPlayer.maxHp! += 10; updatedPlayer.hp += 10; updatedPlayer.atk += 5; updatedPlayer.currentHp = updatedPlayer.maxHp;
                      }
                      const newInv = inventory.map(p => p.id === playerPet.id ? updatedPlayer : p);
                      setInventory(newInv);
                      setUser(prev => prev ? ({...prev, coins: prev.coins + coins}) : null);
                      saveGame(user!, newInv);
                      setBattleCommand(null);
                      return;
                  }
              }

              // 2. Enemy Turn (Delayed)
              setTimeout(() => {
                  if (isBattleOver) return;
                  let eDmg = Math.max(2, Math.floor((enemyPet.atk * 0.4) - (playerPet.def * 0.1)));
                  
                  if (isDefending) {
                      eDmg = Math.floor(eDmg * 0.5);
                      setBattleLog(prev => ["Blocked the attack!", ...prev]);
                  }

                  const newPlayerHp = Math.max(0, (playerPet.currentHp || playerPet.hp) - eDmg);
                  setPlayerPet(prev => prev ? ({...prev, currentHp: newPlayerHp}) : null);
                  setBattleLog(prev => [`Enemy dealt ${eDmg} dmg!`, ...prev]);
                  
                  if (newPlayerHp <= 0) {
                      setIsBattleOver(true);
                      setBattleLog(prev => ["YOU FAINTED...", ...prev]);
                      const updatedPlayer = { ...playerPet, currentHp: 0 };
                      const newInv = inventory.map(p => p.id === playerPet.id ? updatedPlayer : p);
                      setInventory(newInv);
                      saveGame(user!, newInv);
                  }
                  
                  // Reset Command to allow next turn
                  setBattleCommand(null);

              }, 1000);
          };

          executeTurn();
      }
  }, [battleCommand, gameState, isBattleOver]);

  const saveGame = (u: UserProfile, i: Pixupet[]) => {
      const updatedUser = { ...u, lastSaveAt: Date.now() };
      setUser(updatedUser);
      setInventory(i);
      localStorage.setItem('pixupet_user_v1', JSON.stringify(updatedUser));
      localStorage.setItem('pixupet_inventory_v1', JSON.stringify(i));
      localStorage.setItem('pixupet_version', SAVE_VERSION);
  };

  const triggerShake = () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
  };

  const handleFeed = (itemKey: string) => {
      const item = ITEMS_DB[itemKey];
      const pet = inventory[0];
      if (pet.hunger >= 100 && item.type === 'Food') {
          alert("Pet is full!");
          return;
      }
      let newPet = { ...pet };
      if (item.effect) newPet = item.effect(newPet);
      const newInvList = [...user!.inventory];
      const idx = newInvList.indexOf(itemKey);
      if (idx > -1) newInvList.splice(idx, 1);
      const newUser = { ...user!, inventory: newInvList };
      const newInventory = [newPet, ...inventory.slice(1)];
      saveGame(newUser, newInventory);
      setIsFeeding(false);
      triggerShake();
      spawnFloatText("YUMMY!", "text-green-400");
  };

  const handleBuy = (itemKey: string) => {
      const item = ITEMS_DB[itemKey];
      if (!user || user.coins < item.price) {
          alert("Not enough coins!");
          return;
      }
      const newUser = { ...user, coins: user.coins - item.price, inventory: [...user.inventory, itemKey] };
      setUser(newUser); // Optimistic update
      saveGame(newUser, inventory);
      spawnFloatText("- " + item.price, "text-yellow-400");
  };
  
  const handleEvolve = async (pet: Pixupet) => {
      const confirmed = window.confirm(`Initialize Evolution Protocol? This will permanently rewrite ${pet.name}'s code based on your training style!`);
      if (!confirmed) return;
      
      setGameState('SCAN');
      setScanMessage("COMPILING EVOLUTION PROTOCOL...");
      try {
          const result = await evolveVoxelScene(pet);
          
          // Generate new art using the detailed description
          const newArt = await generateCardArt(result.visual_design, result.nextName, result.visual_design);
          
          const evolvedPet: Pixupet = {
              ...pet,
              visual_design: result.visual_design,
              voxelCode: makeBackgroundTransparent(result.code),
              cardArtUrl: newArt,
              name: result.nextName,
              stage: result.nextStage,
              // Stat Boosts
              atk: pet.atk + 15,
              def: pet.def + 15,
              spd: pet.spd + 15,
              maxHp: (pet.maxHp||100) + 50,
              currentHp: (pet.maxHp||100) + 50,
          };
          
          const newInv = inventory.map(p => p.id === pet.id ? evolvedPet : p);
          setInventory(newInv);
          saveGame(user!, newInv);
          setGameState('NEXUS');
          spawnFloatText("EVOLUTION SUCCESSFUL!", "text-purple-400");
          
          // Show what happened
          alert(`Protocol: ${result.protocolName} Accepted.\nForm upgraded to: ${result.nextStage}`);
          
      } catch (e) {
          console.error(e);
          setGameState('NEXUS');
          alert("Evolution Protocol Failed. System unstable.");
      }
  };

  const handleTrain = (stat: 'atk'|'def'|'spd') => {
      const pet = inventory[0];
      if (pet.fatigue >= 80) {
          alert("Pet needs a reboot (sleep)!");
          return;
      }
      setGameState('TRAINING');
      setTrainingStat(stat);
      let progress = 0;
      const trainInterval = setInterval(() => {
          progress += 10;
          if (progress >= 100) {
              clearInterval(trainInterval);
              const newPet = { ...pet };
              newPet[stat] += 1;
              newPet.fatigue += 20;
              newPet.exp += 10;
              newPet.hunger = Math.max(0, newPet.hunger - 10);
              const newInv = [newPet, ...inventory.slice(1)];
              saveGame(user!, newInv);
              setGameState('NEXUS');
              spawnFloatText(`+1 ${stat.toUpperCase()}!`, "text-yellow-400");
          }
      }, 200);
  };

  const spawnFloatText = (text: string, color: string) => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, text, x: 50 + (Math.random()-0.5)*20, y: 40, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  const triggerEvent = (type: EventType, data?: any) => {
      if (activeEvent || isFeeding) return; 
      triggerShake();
      let initialData = data;
      if (type === 'WILD_BATTLE' && !data) {
           const enemy = getRandomEnemy(user?.currentRank || 'E', inventory[0].level);
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

      // Auto-Resolve Loop for Non-Battle events
      setTimeout(() => {
          if (type === 'WILD_BATTLE') resolveAutoBattle(newEvent, inventory[0]);
          else if (type === 'TREASURE') resolveTreasure(newEvent);
          else if (type === 'MERCHANT') {
              setActiveEvent(prev => prev ? {...prev, step: 'RESULT', reward: 'Offer: 100 Coins -> Mystery Box', logs: [...prev.logs, "Trade?"]} : null);
          }
      }, 1500);
  };

  const resolveTreasure = (event: RandomEvent) => {
      const itemKey = getLootDrop('E');
      let rewardText = "";
      let updatedUser = user;
      if (itemKey) {
          const item = ITEMS_DB[itemKey];
          updatedUser = { ...user!, inventory: [...(user?.inventory || []), itemKey] };
          rewardText = `${item.name} (${item.rarity})`;
      } else {
          const foundCoins = Math.floor(Math.random() * 50) + 10;
          updatedUser = { ...user!, coins: user!.coins + foundCoins };
          rewardText = `${foundCoins} Coins`;
      }
      saveGame(updatedUser!, inventory);
      setActiveEvent(prev => prev ? { ...prev, step: 'RESULT', reward: rewardText, logs: [...prev.logs, `You found: ${rewardText}`] } : null);
  };

  // Automated battle (for Wild Events only - Arena is manual)
  const resolveAutoBattle = (event: RandomEvent, player: Pixupet) => {
      setActiveEvent(prev => prev ? { ...prev, step: 'ACTION' } : null);
      const enemy = event.data as Pixupet;
      let pHp = player.currentHp || player.hp;
      let eHp = enemy.hp;
      const logs: string[] = [...event.logs];

      const battleLoop = setInterval(() => {
          if (!event) { clearInterval(battleLoop); return; }
          
          // Player Hit
          const pCrit = Math.random() < (player.happiness || 50) / 500; 
          let pDmg = Math.max(5, Math.floor((player.atk * 0.5) - (enemy.def * 0.1)));
          if(pCrit) { pDmg *= 2; logs.push("CRITICAL HIT!"); }
          eHp -= pDmg;
          logs.push(`${player.name} hits for ${pDmg} dmg!`);
          
          if (eHp <= 0) {
              clearInterval(battleLoop);
              const xp = 30;
              const coins = 20;
              const updatedPet = { ...player, exp: player.exp + xp, currentHp: pHp, happiness: Math.min(100, (player.happiness||50) + 2) };
              if (updatedPet.exp >= updatedPet.maxExp) {
                   updatedPet.level++; updatedPet.exp = 0; updatedPet.maxExp = Math.floor(updatedPet.maxExp * 1.2);
                   updatedPet.atk += 5; updatedPet.maxHp! += 10; updatedPet.hp += 10; updatedPet.currentHp = updatedPet.maxHp;
                   logs.push("LEVEL UP!");
              }
              const newInv = [updatedPet, ...inventory.slice(1)];
              const newUser = { ...user!, coins: user!.coins + coins, battlesWon: (user!.battlesWon||0) + 1 };
              saveGame(newUser, newInv);
              setActiveEvent(prev => prev ? { ...prev, step: 'RESULT', winner: 'PLAYER', reward: `+${xp} XP | +${coins} Coins`, logs: [...logs, `Enemy defeated!`] } : null);
              return;
          }

          // Enemy Hit
          const eDmg = Math.max(2, Math.floor((enemy.atk * 0.4) - (player.def * 0.1)));
          pHp -= eDmg;
          logs.push(`Enemy hits back for ${eDmg} dmg!`);

          if (pHp <= 0) {
              clearInterval(battleLoop);
              const updatedPet = { ...player, currentHp: 0, happiness: Math.max(0, (player.happiness||50) - 10) };
              const newInv = [updatedPet, ...inventory.slice(1)];
              saveGame(user!, newInv);
              setActiveEvent(prev => prev ? { ...prev, step: 'RESULT', winner: 'ENEMY', logs: [...logs, `${player.name} fainted...`] } : null);
              return;
          }

          setActiveEvent(prev => prev ? { ...prev, logs: [...logs] } : null);
      }, 800);
  };

  // AFK Loop
  useEffect(() => {
      const loop = setInterval(() => {
          if (gameState === 'NEXUS' && inventory.length > 0 && !activeEvent && !isFeeding) {
              if (Math.random() < 0.02) {
                  const rand = Math.random();
                  if (rand < 0.6) triggerEvent('WILD_BATTLE');
                  else if (rand < 0.9) triggerEvent('TREASURE');
                  else triggerEvent('MERCHANT');
              }
          }
      }, 2000);
      return () => clearInterval(loop);
  }, [gameState, inventory, activeEvent, isFeeding]);

  const handleScan = async (img: string) => {
      setGameState('SCAN');
      try {
          const stats = await analyzeObject(img);
          let code = await generateVoxelScene(img, stats.visual_design, stats.bodyType);
          code = makeBackgroundTransparent(zoomCamera(hideBodyText(code), 1.0));
          
          // Generate Art
          generateCardArt(stats.description, stats.name, stats.visual_design)
              .then(url => {
                  setInventory(prev => prev.map(p => p.id === newPet.id ? {...p, cardArtUrl: url} : p));
              }).catch(console.error);
          
          const newPet: Pixupet = {
              ...stats, voxelCode: code, imageSource: img, cardArtUrl: img,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 50
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
      const u: UserProfile = { name: 'Tamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), lastSaveAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: ['data_burger', 'potion_small'] };
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
      setEnemyPet({ ...enemy, voxelCode: makeBackgroundTransparent(enemyVoxel), currentHp: enemy.hp });
      
      setIsBattleOver(false);
      setPlayerCharged(false);
      setBattleCommand(null);
      setBattleLog(["BATTLE START!", "Choose a command!"]);
      setGameState('ARENA');
  };

  const activePet = inventory[0];

  // RENDER
  if (gameState === 'SPLASH') {
      return (
          <div className="w-full h-screen bg-yellow-300 flex items-center justify-center p-4">
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-8 text-center animate-pop-in flex flex-col items-center">
                  <BrandLogo scale={1.5} className="mb-8" />
                  <p className="font-bold mb-8 bg-black text-white inline-block px-2 py-1">VERSION 4.0 - EVOLUTION PROTOCOLS</p>
                  <button onClick={handleCreateProfile} className="neo-btn bg-cyan-300 w-full py-4 text-xl hover:bg-cyan-200">START SYSTEM</button>
              </div>
          </div>
      );
  }
  
  if (gameState === 'TRAINING') {
      return (
          <div className="w-full h-screen bg-orange-300 flex items-center justify-center flex-col">
              <h1 className="text-6xl font-black italic mb-8 animate-pulse">UPLOADING...</h1>
              <div className="w-64 h-64 bg-white border-4 border-black flex items-center justify-center rounded-full shadow-[8px_8px_0px_0px_black] mb-8 overflow-hidden">
                   {activePet && <img src={activePet.cardArtUrl || activePet.imageSource} className="w-full h-full object-cover animate-bounce" />}
              </div>
              <div className="text-2xl font-black bg-white border-2 border-black px-4 py-2">FOCUS: {trainingStat?.toUpperCase()}</div>
          </div>
      );
  }

  if (gameState === 'SHOP') {
      return (
          <div className="w-full h-screen bg-purple-50 p-4 flex flex-col">
               <div className="flex justify-between mb-4 items-center bg-white border-b-4 border-black p-4 -m-4 sticky top-0 z-10 shadow-md">
                  <h2 className="text-3xl font-black text-purple-600 tracking-tighter">NEON MARKET</h2>
                  <div className="bg-yellow-300 px-4 py-2 border-2 border-black font-black rounded-full shadow-[2px_2px_0px_0px_black]">💰 {user?.coins}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 overflow-y-auto py-6">
                  {Object.values(ITEMS_DB).map(item => (
                      <div key={item.id} className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_black] flex flex-col justify-between hover:-translate-y-1 transition-transform">
                          <div className="text-center text-4xl mb-2">{item.icon}</div>
                          <div className="font-black text-sm mb-1">{item.name}</div>
                          <div className="text-xs text-gray-500 mb-2 h-8 leading-tight">{item.description}</div>
                          <button 
                             onClick={() => handleBuy(item.id)}
                             disabled={(user?.coins || 0) < item.price}
                             className="neo-btn bg-green-400 py-2 w-full text-xs hover:bg-green-300 disabled:opacity-50 disabled:bg-gray-300"
                          >
                              BUY {item.price}
                          </button>
                      </div>
                  ))}
              </div>
              <button onClick={() => setGameState('NEXUS')} className="neo-btn bg-white py-4 w-full mt-4 shrink-0">EXIT SHOP</button>
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
                  <h2 className="text-3xl font-black">DATABASE</h2>
                  <button onClick={() => setGameState('NEXUS')} className="neo-btn bg-white px-4">CLOSE</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
                  {inventory.map(pet => (
                      <PixuCard 
                        key={pet.id} 
                        pet={pet} 
                        selected={pet.id === inventory[0].id}
                        onEvolve={() => handleEvolve(pet)}
                        onClick={() => {
                            const otherPets = inventory.filter(p => p.id !== pet.id);
                            const newInv = [pet, ...otherPets];
                            setInventory(newInv);
                            saveGame(user!, newInv);
                            setGameState('NEXUS');
                        }} 
                      />
                  ))}
              </div>
          </div>
      );
  }
  
  if (gameState === 'SYNTHESIS') {
      return (
          <div className="w-full h-screen bg-purple-100 flex flex-col items-center justify-center p-4">
              <h2 className="text-4xl font-black mb-8">FUSION LAB</h2>
              <div className="flex gap-4 mb-8 w-full max-w-md justify-center">
                  {['a', 'b'].map(slot => (
                      <div key={slot} onClick={() => { setIsFusionSelecting(slot as 'a'|'b'); setGameState('INVENTORY'); }} 
                           className="w-32 h-48 border-4 border-dashed border-black bg-white/50 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-white transition-colors">
                          {fusionSlots[slot as 'a'|'b'] ? (
                              <img src={fusionSlots[slot as 'a'|'b']!.cardArtUrl || fusionSlots[slot as 'a'|'b']!.imageSource} className="w-full h-full object-cover" />
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
      return (
          <div className={`w-full h-screen bg-gray-900 flex flex-col relative overflow-hidden ${screenShake ? 'shake' : ''}`}>
              <div className="absolute inset-0 flex flex-col md:flex-row pb-32">
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
              
              {/* TACTICAL UI AREA */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-2 z-20 h-40 border-t-4 border-white flex flex-col">
                   <div className="text-center text-yellow-300 font-mono text-sm mb-2 border-b border-gray-700 pb-1">{battleLog[0]}</div>
                   
                   {!isBattleOver && (
                       <div className="flex gap-2 justify-center items-center h-full">
                           <button onClick={() => setBattleCommand('ATTACK')} disabled={!!battleCommand} className={`neo-btn bg-red-500 text-white w-24 h-20 text-xs disabled:opacity-50 ${battleCommand === 'ATTACK' ? 'bg-red-300' : ''}`}>
                               ATTACK<br/><span className="text-[8px] font-normal opacity-80">Normal Dmg</span>
                           </button>
                           <button onClick={() => setBattleCommand('DEFEND')} disabled={!!battleCommand} className={`neo-btn bg-blue-500 text-white w-24 h-20 text-xs disabled:opacity-50 ${battleCommand === 'DEFEND' ? 'bg-blue-300' : ''}`}>
                               DEFEND<br/><span className="text-[8px] font-normal opacity-80">-50% Dmg</span>
                           </button>
                           <button onClick={() => setBattleCommand('CHARGE')} disabled={!!battleCommand} className={`neo-btn bg-yellow-500 text-black w-24 h-20 text-xs disabled:opacity-50 ${battleCommand === 'CHARGE' ? 'bg-yellow-300' : ''}`}>
                               CHARGE<br/><span className="text-[8px] font-normal opacity-80">x2 Next Hit</span>
                           </button>
                       </div>
                   )}

                   {isBattleOver && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-pop-in z-30">
                          <div className={`text-4xl mb-4 font-black ${playerPet?.currentHp! > 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                              {playerPet?.currentHp! > 0 ? "VICTORY!" : "DEFEATED..."}
                          </div>
                          <button onClick={() => setGameState('NEXUS')} className="neo-btn bg-white text-black px-8 py-3 text-xl hover:bg-gray-200">RETURN</button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
      <div className={`w-full h-screen relative overflow-hidden flex flex-col ${activePet ? HABITAT_PATTERNS[activePet.element] || 'bg-gray-100' : 'bg-gray-100'} ${screenShake ? 'shake' : ''}`}>
          {!activePet ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                 <BrandLogo className="mb-8" />
                 <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_black] max-w-sm">
                     <p className="mb-8 font-bold text-xl">Scan any real-world object to materialize a Spark Form!</p>
                     <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-black rounded-full flex items-center justify-center text-yellow-400 border-4 border-yellow-400 hover:scale-110 transition-transform mx-auto shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                         <NeonIcon path={ICONS.SCAN} size={48} />
                     </button>
                 </div>
             </div>
          ) : (
             <>
                <div className={`absolute inset-0 z-0 w-full h-full transition-opacity duration-500 ${activeEvent || isFeeding ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                    <VoxelViewer 
                        code={activePet.voxelCode} 
                        onRef={ref => iframeRef.current = ref} 
                        mode={'HABITAT'} 
                        weather={weather} 
                        time={gameHour} 
                        paused={!!activeEvent || !!offlineReport || isFeeding || gameState !== 'NEXUS'} 
                    />
                </div>
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {floatingTexts.map(ft => (
                        <div key={ft.id} className={`absolute font-black text-2xl stroke-black ${ft.color} animate-float-up`} style={{ left: `${ft.x}%`, top: `${ft.y}%`, textShadow: '2px 2px 0 #000' }}>{ft.text}</div>
                    ))}
                </div>
                {offlineReport && <WelcomeModal report={offlineReport} onClose={() => setOfflineReport(null)} />}
                {activeEvent && <EventModal event={activeEvent} onClose={() => { setActiveEvent(null); setGameState('NEXUS'); }} playerPet={activePet} />}
                {isFeeding && (
                    <div className="absolute inset-0 z-40 bg-black/50 flex items-end justify-center pointer-events-auto">
                        <div className="bg-white w-full p-4 rounded-t-3xl border-t-4 border-black animate-slide-up h-1/2 overflow-y-auto shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                            <h3 className="font-black text-xl mb-4">SELECT FOOD</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {user?.inventory.filter(id => ITEMS_DB[id].type === 'Food' || ITEMS_DB[id].type === 'Consumable').map((id, idx) => (
                                    <button key={idx} onClick={() => handleFeed(id)} className="border-2 border-black p-2 rounded flex flex-col items-center hover:bg-yellow-100 transition-colors">
                                        <span className="text-2xl">{ITEMS_DB[id].icon}</span>
                                        <span className="text-[10px] font-bold text-center leading-tight mt-1">{ITEMS_DB[id].name}</span>
                                    </button>
                                ))}
                                {user?.inventory.filter(id => ITEMS_DB[id].type === 'Food').length === 0 && <div className="col-span-3 text-center text-gray-500 italic">No food! Buy some in the Shop.</div>}
                            </div>
                            <button onClick={() => setIsFeeding(false)} className="mt-4 w-full py-3 font-bold bg-gray-200 rounded hover:bg-gray-300">CANCEL</button>
                        </div>
                    </div>
                )}
                <div className="absolute top-0 left-0 right-0 p-4 z-20 pointer-events-none flex justify-between items-start">
                    <div className="bg-white border-2 border-black px-4 py-2 rounded-full shadow-[4px_4px_0px_0px_black] pointer-events-auto flex gap-4 items-center min-w-[200px]">
                        <div className="w-full">
                            <div className="font-black text-lg flex justify-between"><span>{activePet.name}</span><span className="text-xs text-gray-500">{activePet.stage} Lv.{activePet.level}</span></div>
                            <div className="flex flex-col gap-1 mt-1">
                                <StatBar label="HP" value={activePet.currentHp} max={activePet.maxHp} color="bg-green-500" />
                                <StatBar label="HUN" value={activePet.hunger} max={100} color="bg-orange-400" />
                                <StatBar label="HAP" value={activePet.happiness || 50} max={100} color="bg-pink-400" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pointer-events-auto items-start">
                        <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-xs border-2 border-white flex items-center gap-1">
                            <span>{weather === 'RAIN' ? '🌧️' : weather === 'STORM' ? '⛈️' : '☀️'}</span>
                            {weather}
                        </div>
                        <button onClick={() => setGameState('SHOP')} className="bg-white border-2 border-black px-4 py-2 rounded-full font-black flex flex-col items-end shadow-[4px_4px_0px_0px_black] hover:bg-yellow-100 active:translate-y-1 active:shadow-none transition-all">
                            <span>💰 {user?.coins}</span>
                            <span className="text-[10px] text-gray-500">SHOP</span>
                        </button>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 z-30 pointer-events-none">
                     <div className="flex justify-center relative top-8 pointer-events-auto mb-4">
                            <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-black rounded-full text-yellow-400 border-4 border-yellow-400 flex items-center justify-center hover:scale-110 shadow-[0px_10px_20px_rgba(0,0,0,0.3)] transition-transform">
                                <NeonIcon path={ICONS.SCAN} size={48} />
                            </button>
                    </div>
                    <div className="bg-white border-t-4 border-x-4 border-black rounded-t-3xl p-4 grid grid-cols-4 gap-2 shadow-[0px_-10px_0px_0px_rgba(0,0,0,0.1)] pointer-events-auto">
                        <NavButton label="ARENA" icon={ICONS.SWORD} onClick={startArenaBattle} />
                        <NavButton label="FEED" icon={ICONS.FOOD} onClick={() => setIsFeeding(true)} />
                        <NavButton label="TRAIN" icon={ICONS.TRAIN} onClick={() => handleTrain('atk')} />
                        <NavButton label="CARDS" icon={ICONS.CARDS} onClick={() => setGameState('INVENTORY')} />
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
