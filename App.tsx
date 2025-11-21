
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { generateVoxelScene, analyzeObject, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, AITactic, calculateOfflineProgress, OfflineReport, EVO_THRESHOLDS, MonsterStage, determineEvolutionPath, STARTER_PACKS, getProceduralMonsterArt, MonsterStats, GAME_HINTS } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'ONBOARDING' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'COLLECTION' | 'SHOP';
type EventType = 'WILD_BATTLE' | 'LOOT_FOUND' | 'NOTHING';

const SAVE_VERSION = 'v5.1_EVO_RESTORED'; 

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

interface FloatingText {
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
}

// --- ICONS ---
const ICONS = {
    CAMERA: "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 1,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 1,1 9,12A3,3 0 0,1 12,9Z",
    NEXUS: "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    CARDS: "M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H20V4H4M6,6H18V14H6V6Z",
    SWORD: "M6,2L2,6L6,10L10,6L6,2M6,16L2,20L6,24L10,20L6,16M20,6L16,2L12,6L16,10L20,6M16,16L12,20L16,24L20,20L16,16M9,12L12,9L15,12L12,15L9,12Z",
    SHOP: "M4,4H20V6H4V4M4,9H20V19H4V9M6,12V16H8V12H6M10,12V16H12V12H10M14,12V16H16V12H14M2,2V22H22V2H2Z",
    BAG: "M12,2C12,2 6,4 6,10V22H18V10C18,4 12,2 12,2M12,6C13.1,6 14,6.9 14,8V10H10V8C10,6.9 10.9,6 12,6Z",
    HINT: "M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z"
};

const NeonIcon: React.FC<{ path: string, size?: number, className?: string }> = ({ path, size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`${className}`}>
        <path d={path} />
    </svg>
);

const AnimatedLogo = () => {
    const text = "PIXUPET";
    return (
        <div className="voxel-logo-container mb-4 text-6xl md:text-7xl">
            {text.split('').map((char, i) => (
                <span key={i} className="logo-char" style={{ animationDelay: `${i * 0.1}s` }}>{char}</span>
            ))}
        </div>
    );
};

const VoxelViewer = memo(({ code, onRef, className, mode = 'HABITAT', paused = false }: { code: string, onRef?: any, className?: string, mode?: 'HABITAT'|'BATTLE', paused?: boolean }) => {
    const localRef = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        if (onRef) {
             if (typeof onRef === 'function') onRef(localRef.current);
             else onRef.current = localRef.current;
        }
    }, [onRef]);
    useEffect(() => {
        const iframe = localRef.current;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'SET_MODE', value: mode }, '*');
        }
    }, [mode, paused]);
    return (
        <iframe 
            ref={localRef}
            srcDoc={code} 
            className={`border-0 pointer-events-auto ${className || "w-full h-full"}`} 
            title="Voxel View"
            style={{ background: 'transparent', width: '100%', height: '100%' }} 
            scrolling="no" 
        />
    );
}, (prev, next) => prev.code === next.code && prev.mode === next.mode && prev.paused === next.paused);

const PopButton: React.FC<{ label?: string, subLabel?: string, icon?: string, onClick: () => void, variant?: 'primary' | 'danger' | 'warning' | 'default' | 'action', disabled?: boolean, className?: string }> = ({ label, subLabel, icon, onClick, variant = 'default', disabled, className = "" }) => {
    const vClass = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-warning' : variant === 'action' ? 'btn-action' : 'bg-white text-black hover:bg-gray-100';
    return (
        <button onClick={onClick} disabled={disabled} className={`pop-btn ${vClass} ${className} flex-col`}>
            <div className="flex items-center gap-2">
                {icon && <NeonIcon path={icon} size={20} />}
                {label}
            </div>
            {subLabel && <span className="text-[10px] opacity-80 font-bold normal-case tracking-normal">{subLabel}</span>}
        </button>
    );
}

const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void, selected?: boolean }> = ({ pet, onClick, selected }) => {
    return (
        <div onClick={onClick} className={`pop-card relative cursor-pointer hover:scale-105 transition-transform flex flex-col ${selected ? 'ring-4 ring-blue-500' : ''}`}>
            <div className={`h-8 ${ELEMENT_THEMES[pet.element].bg} border-b-2 border-black flex items-center justify-between px-2`}>
                 <span className="text-[10px] font-black text-white uppercase">{pet.element}</span>
                 <span className="text-sm">{ELEMENT_THEMES[pet.element].icon}</span>
            </div>
            <div className="aspect-square bg-gray-100 border-b-2 border-black relative overflow-hidden">
                 <img src={pet.cardArtUrl} className="w-full h-full object-cover" alt={pet.name} />
                 <div className="absolute bottom-1 right-1 bg-black text-white text-[10px] font-bold px-1 rounded">Lv.{pet.level}</div>
            </div>
            <div className="p-2 bg-white flex-1">
                 <div className="text-xs font-black truncate">{pet.name}</div>
                 <div className="text-[10px] text-gray-500 font-bold">{pet.stage}</div>
            </div>
        </div>
    );
}

const PetStatsPanel = ({ pet }: { pet: Pixupet }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (!expanded) {
        return (
            <div onClick={() => setExpanded(true)} className="pop-card absolute top-20 right-4 bg-white p-2 z-30 cursor-pointer hover:bg-gray-50 w-40">
                <div className="text-xs font-black uppercase flex justify-between">
                    <span>Stats</span>
                    <span>▼</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-full bg-gray-200 rounded-full border border-black overflow-hidden">
                         <div className="h-full bg-green-500" style={{width: `${(pet.currentHp!/pet.maxHp!)*100}%`}}></div>
                    </div>
                    <span className="text-[10px] font-bold">HP</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pop-card absolute top-20 right-4 bg-white p-4 z-30 w-56 animate-pop-in">
            <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-1">
                <span className="font-black text-sm">PET STATS</span>
                <button onClick={(e) => {e.stopPropagation(); setExpanded(false);}} className="font-bold text-xs hover:text-red-500">CLOSE ▲</button>
            </div>
            
            <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold">
                     <span>HP</span>
                     <span>{pet.currentHp}/{pet.maxHp}</span>
                 </div>
                 <div className="h-2 w-full bg-gray-200 rounded-full border border-black overflow-hidden">
                     <div className="h-full bg-green-500" style={{width: `${(pet.currentHp!/pet.maxHp!)*100}%`}}></div>
                 </div>

                 <div className="flex justify-between text-xs font-bold">
                     <span>XP</span>
                     <span>{pet.exp}/{pet.maxExp}</span>
                 </div>
                 <div className="h-2 w-full bg-gray-200 rounded-full border border-black overflow-hidden">
                     <div className="h-full bg-blue-400" style={{width: `${(pet.exp/pet.maxExp)*100}%`}}></div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-gray-300">
                     <div className="bg-red-100 p-1 rounded text-center">
                         <div className="text-[10px] font-bold text-red-800">ATK</div>
                         <div className="font-black text-sm">{pet.atk}</div>
                     </div>
                     <div className="bg-blue-100 p-1 rounded text-center">
                         <div className="text-[10px] font-bold text-blue-800">DEF</div>
                         <div className="font-black text-sm">{pet.def}</div>
                     </div>
                     <div className="bg-yellow-100 p-1 rounded text-center">
                         <div className="text-[10px] font-bold text-yellow-800">SPD</div>
                         <div className="font-black text-sm">{pet.spd}</div>
                     </div>
                     <div className="bg-pink-100 p-1 rounded text-center">
                         <div className="text-[10px] font-bold text-pink-800">HAP</div>
                         <div className="font-black text-sm">{pet.happiness}</div>
                     </div>
                 </div>
            </div>
        </div>
    );
}

const HintsModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-4 border-black rounded-2xl shadow-[12px_12px_0_#000] w-full max-w-md overflow-hidden animate-pop-in">
                <div className="bg-yellow-300 p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-xl font-black">GAME HINTS</h2>
                    <button onClick={onClose} className="font-black text-xl">X</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-3">
                        {GAME_HINTS.map((hint, i) => (
                            <li key={i} className="flex gap-2 items-start text-sm font-bold text-gray-700">
                                <span className="text-blue-500">💡</span>
                                {hint}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const AutoBattleModal = ({ player, enemy, onComplete, logs }: { player: Pixupet, enemy: Pixupet, onComplete: (win: boolean) => void, logs: string[] }) => {
    const [result, setResult] = useState<'WIN'|'LOSE'|null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        if (logs && logs.length > 0) {
             const lastLog = logs[logs.length - 1];
             if (lastLog && typeof lastLog === 'string') {
                 if (lastLog.includes("WIN")) {
                      setTimeout(() => { setResult('WIN'); setTimeout(() => onComplete(true), 1500); }, 1000);
                 } else if (lastLog.includes("LOSE")) {
                      setTimeout(() => { setResult('LOSE'); setTimeout(() => onComplete(false), 1500); }, 1000);
                 }
             }
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-opacity duration-300">
            <div className={`w-full max-w-2xl h-[70vh] bg-white border-4 border-black rounded-2xl shadow-[12px_12px_0_#000] overflow-hidden flex flex-col relative animate-pop-in ${result ? 'scale-95 opacity-90' : 'scale-100'}`}>
                 
                 {/* HEADER */}
                 <div className="bg-red-500 text-white font-black p-3 text-center text-xl border-b-4 border-black flex justify-between items-center">
                     <span>WILD ENCOUNTER</span>
                     <span className="animate-pulse">⚔️ FIGHTING...</span>
                 </div>
                 
                 {/* 3D ARENA */}
                 <div className="flex-1 bg-gray-200 relative flex overflow-hidden">
                     {/* BACKGROUND GRADIENT */}
                     <div className={`absolute inset-0 opacity-30 ${ELEMENT_THEMES[enemy.element].bg}`}></div>

                     {/* PLAYER SIDE */}
                     <div className="w-1/2 h-full relative border-r-2 border-black/20">
                         <div className="absolute bottom-4 left-4 z-10 bg-white px-2 py-1 border-2 border-black rounded shadow-md text-xs font-black">
                             {player.name} (Lv.{player.level})
                             <div className="w-full h-1 bg-gray-300 mt-1"><div className="h-full bg-green-500" style={{width: '100%'}}></div></div>
                         </div>
                         <VoxelViewer code={player.voxelCode} mode="BATTLE" className="w-full h-full" />
                     </div>

                     {/* ENEMY SIDE */}
                     <div className="w-1/2 h-full relative">
                         <div className="absolute top-4 right-4 z-10 bg-white px-2 py-1 border-2 border-black rounded shadow-md text-xs font-black text-right">
                             {enemy.name} (Lv.{enemy.level})
                             <div className="w-full h-1 bg-gray-300 mt-1"><div className="h-full bg-red-500" style={{width: '100%'}}></div></div>
                         </div>
                         <VoxelViewer code={enemy.voxelCode} mode="BATTLE" className="w-full h-full" />
                     </div>

                     {/* VS BADGE */}
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-black italic text-red-600 drop-shadow-[4px_4px_0_#000] animate-bounce z-20">
                         VS
                     </div>

                     {/* RESULT OVERLAY */}
                     {result && (
                         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                             <div className={`text-6xl font-black text-white transform rotate-[-10deg] border-4 border-black px-8 py-4 shadow-[8px_8px_0_#000] ${result==='WIN' ? 'bg-green-500' : 'bg-red-500'}`}>
                                 {result === 'WIN' ? 'VICTORY!' : 'DEFEATED'}
                             </div>
                         </div>
                     )}
                 </div>

                 {/* BATTLE LOG */}
                 <div ref={logRef} className="h-32 bg-black text-green-400 font-mono text-xs p-4 border-t-4 border-black overflow-y-auto scroll-smooth">
                     {logs.map((l, i) => (
                         <div key={i} className="mb-1 border-b border-green-900 pb-1 last:border-0 animate-fade-in">
                             {l}
                         </div>
                     ))}
                 </div>
            </div>
        </div>
    );
}

const CardDetailModal = ({ pet, onClose, onEquip, isEquipped, onEvolve }: { pet: Pixupet, onClose: () => void, onEquip: () => void, isEquipped: boolean, onEvolve: (p: Pixupet) => void }) => {
    const { protocolName, icon, desc, color } = determineEvolutionPath({ atk: pet.atk, def: pet.def, spd: pet.spd, happiness: pet.happiness || 50 });
    
    const canEvolve = (pet.stage === 'Noob' && pet.level >= EVO_THRESHOLDS.PRO) ||
                      (pet.stage === 'Pro' && pet.level >= EVO_THRESHOLDS.ELITE) ||
                      (pet.stage === 'Elite' && pet.level >= EVO_THRESHOLDS.LEGEND);

    const [evolving, setEvolving] = useState(false);

    const handleEvolveClick = async () => {
        setEvolving(true);
        await onEvolve(pet);
        setEvolving(false);
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white border-4 border-black rounded-2xl shadow-[12px_12px_0_#000] flex flex-col md:flex-row overflow-hidden animate-pop-in max-h-[90vh]">
                <div className={`md:w-1/2 ${ELEMENT_THEMES[pet.element].bg} p-8 flex items-center justify-center relative border-b-4 md:border-b-0 md:border-r-4 border-black`}>
                    <div className="w-full h-64 bg-white border-4 border-black shadow-lg rounded-xl overflow-hidden">
                         {evolving ? (
                             <div className="w-full h-full flex items-center justify-center flex-col">
                                 <div className="text-4xl animate-spin">🧬</div>
                                 <div className="font-black mt-4">EVOLVING...</div>
                             </div>
                         ) : (
                             <VoxelViewer code={pet.voxelCode} mode="BATTLE" />
                         )}
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white border-2 border-black w-8 h-8 font-black rounded-full hover:bg-red-100">X</button>
                </div>
                <div className="md:w-1/2 p-6 bg-white overflow-y-auto">
                    <h2 className="text-3xl font-black uppercase leading-none mb-1">{pet.name}</h2>
                    <div className="text-sm font-bold text-gray-500 mb-4">{pet.stage} Class • Lv.{pet.level}</div>
                    <div className="space-y-4 mb-6">
                         <div className="p-3 bg-gray-50 border-2 border-black rounded-lg">
                             <div className="text-xs font-black text-gray-400 uppercase mb-1">Build Path</div>
                             <div className={`font-black ${color} flex items-center gap-2`}>{icon} {protocolName}</div>
                             <div className="text-xs text-gray-600">{desc}</div>
                         </div>
                         
                         {canEvolve && !evolving && (
                             <div className="p-3 bg-yellow-50 border-2 border-yellow-500 rounded-lg animate-pulse">
                                 <div className="text-xs font-black text-yellow-600 uppercase mb-1">EVOLUTION AVAILABLE</div>
                                 <PopButton label="EVOLVE NOW!" onClick={handleEvolveClick} variant="warning" className="w-full" />
                             </div>
                         )}

                         <div className="space-y-2">
                            <div className="flex items-center text-xs font-bold"><span className="w-8">HP</span><div className="h-3 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-green-400" style={{width: `${Math.min(100, (pet.currentHp!/pet.maxHp!)*100)}%`}}></div></div></div>
                            <div className="flex items-center text-xs font-bold"><span className="w-8">ATK</span><div className="h-3 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-red-400" style={{width: `${Math.min(100, pet.atk)}%`}}></div></div></div>
                            <div className="flex items-center text-xs font-bold"><span className="w-8">DEF</span><div className="h-3 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-blue-400" style={{width: `${Math.min(100, pet.def)}%`}}></div></div></div>
                         </div>
                    </div>
                    <PopButton label={isEquipped ? "CURRENT MAIN" : "SET AS MAIN"} onClick={onEquip} variant={isEquipped ? 'default' : 'primary'} disabled={isEquipped} className="w-full" />
                </div>
            </div>
        </div>
    )
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  
  const [explorationStatus, setExplorationStatus] = useState<string>("EXPLORING...");
  const [activeBattle, setActiveBattle] = useState<{enemy: Pixupet, logs: string[]} | null>(null);
  const [selectedCard, setSelectedCard] = useState<Pixupet | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const currentVersion = localStorage.getItem('pixupet_version');
      if (currentVersion !== SAVE_VERSION) {
          localStorage.clear();
          localStorage.setItem('pixupet_version', SAVE_VERSION);
      } else {
          const savedUser = localStorage.getItem('pixupet_user');
          const savedInv = localStorage.getItem('pixupet_inventory');
          if (savedUser && savedInv) {
              setUser(JSON.parse(savedUser));
              setInventory(JSON.parse(savedInv));
              setGameState('NEXUS');
          }
      }
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (user && inventory.length > 0) {
              const u = { ...user, lastSaveAt: Date.now() };
              localStorage.setItem('pixupet_user', JSON.stringify(u));
              localStorage.setItem('pixupet_inventory', JSON.stringify(inventory));
              setUser(u);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [user, inventory]);

  const logEvent = (msg: string) => {
      setEventLog(prev => [msg, ...prev].slice(0, 3));
  }

  const handleEvolve = async (pet: Pixupet) => {
      try {
          const evolvedData = await evolveVoxelScene(pet);
          const updatedPet: Pixupet = {
              ...pet,
              name: evolvedData.nextName,
              stage: evolvedData.nextStage,
              visual_design: evolvedData.visual_design,
              voxelCode: makeBackgroundTransparent(zoomCamera(hideBodyText(evolvedData.code), 0.9)),
              atk: pet.atk + 15,
              def: pet.def + 15,
              spd: pet.spd + 15,
              maxHp: (pet.maxHp || 100) + 50,
              currentHp: (pet.maxHp || 100) + 50
          };
          
          const newInv = inventory.map(p => p.id === pet.id ? updatedPet : p);
          setInventory(newInv);
          spawnFloatText("EVOLUTION COMPLETE!", "text-purple-500");
          logEvent(`${pet.name} evolved into ${updatedPet.name}!`);
      } catch (e) {
          console.error(e);
          spawnFloatText("Evolution Failed...", "text-red-500");
      }
  };

  // --- EXPLORATION LOOP ---
  useEffect(() => {
      if (gameState !== 'NEXUS' || !inventory[0] || activeBattle) return;

      const timer = setInterval(() => {
          if (Math.random() > 0.7) { // More frequent events
              const eventRoll = Math.random();
              
              if (eventRoll > 0.7) {
                  // LOOT
                  const loot = getLootDrop(user?.currentRank || 'E');
                  if (loot) {
                      const item = ITEMS_DB[loot];
                      setUser(u => u ? ({...u, inventory: [...u.inventory, loot], coins: u.coins + 10 }) : null);
                      spawnFloatText(`+ ${item.name}`, "text-green-600");
                      logEvent(`Found ${item.name}!`);
                  }
              } else if (eventRoll > 0.4) {
                  // BATTLE
                  const enemy = getRandomEnemy(user?.currentRank || 'E', inventory[0].level, getGenericVoxel);
                  setExplorationStatus("COMBAT!");
                  startAutoBattle(enemy);
              } else {
                  // FLAVOR EVENT
                  const flavors = ["Chasing a butterfly...", "Taking a nap...", "Sniffing a rock...", "Training moves...", "Zoomies!"];
                  const msg = flavors[Math.floor(Math.random()*flavors.length)];
                  setExplorationStatus(msg);
              }
          }
      }, 3000);

      return () => clearInterval(timer);
  }, [gameState, inventory, activeBattle]);

  const startAutoBattle = (enemy: Pixupet) => {
      const player = inventory[0];
      let logs = [`Wild ${enemy.name} appeared!`];
      setActiveBattle({ enemy, logs });
      
      let pHP = player.currentHp || 100;
      let eHP = enemy.hp;
      let round = 1;
      const battleSteps: string[] = [];

      while (pHP > 0 && eHP > 0 && round < 10) {
          const pDmg = Math.floor(player.atk * (1 + Math.random()));
          eHP -= pDmg;
          battleSteps.push(`You hit for ${pDmg}!`);
          
          if (eHP <= 0) {
              battleSteps.push(`WIN: Enemy KO!`);
              break;
          }

          const eDmg = Math.floor(enemy.atk * (1 + Math.random() * 0.5));
          pHP -= eDmg;
          battleSteps.push(`Enemy hit for ${eDmg}.`);

          if (pHP <= 0) {
              battleSteps.push(`LOSE: You fainted.`);
              break;
          }
          round++;
      }

      let i = 0;
      const interval = setInterval(() => {
          if (i < battleSteps.length) {
              setActiveBattle(prev => prev ? { ...prev, logs: [...prev.logs, battleSteps[i]] } : null);
              i++;
          } else {
              clearInterval(interval);
          }
      }, 800);
  };

  const resolveBattle = (win: boolean) => {
      setActiveBattle(null);
      setExplorationStatus("EXPLORING...");
      if (win) {
          const coins = 50;
          const xp = 40;
          const pet = inventory[0];
          
          let updatedPet = { ...pet, exp: pet.exp + xp };
           if (updatedPet.exp >= updatedPet.maxExp) {
              updatedPet.level++; updatedPet.exp=0; updatedPet.maxExp = Math.floor(updatedPet.maxExp * 1.2);
              updatedPet.atk+=2; updatedPet.maxHp!+=10; updatedPet.hp+=10; updatedPet.currentHp = updatedPet.maxHp;
              spawnFloatText("LEVEL UP!", "text-yellow-500");
          }

          setUser(u => u ? ({...u, coins: u.coins + coins }) : null);
          setInventory([updatedPet, ...inventory.slice(1)]);
          spawnFloatText(`+${coins} Gold`, "text-yellow-500");
          logEvent("Battle Won!");
      } else {
          const pet = { ...inventory[0], currentHp: 10 };
          setInventory([pet, ...inventory.slice(1)]);
          spawnFloatText("Defeated...", "text-red-500");
          logEvent("Retreated from battle.");
      }
  };

  const spawnFloatText = (text: string, color: string = "text-black") => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, text, x: 50, y: 40, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  const handleScan = async (img: string) => {
      setGameState('SCAN');
      try {
          const stats = await analyzeObject(img);
          const code = await generateVoxelScene("", stats.visual_design, stats.bodyType);
          const art = getProceduralMonsterArt(stats.name, stats.element); 

          const newPet: Pixupet = {
              ...stats, 
              voxelCode: makeBackgroundTransparent(zoomCamera(hideBodyText(code), 0.9)), 
              imageSource: art, 
              cardArtUrl: art,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 50
          };
          
          setInventory([newPet, ...inventory]);
          setUser(u => u ? ({...u, inventory: u.inventory}) : null); 
          setTimeout(() => setGameState('NEXUS'), 2000);
      } catch (e) {
          alert("Signal lost. Try again.");
          setGameState('NEXUS');
      }
  };

  const handleSelectStarter = (starterId: string) => {
      const pack = STARTER_PACKS.find(s => s.id === starterId);
      if (!pack) return;

      const art = getProceduralMonsterArt(pack.name, pack.element);
      const voxel = getGenericVoxel(pack.element, pack.bodyType, 'Noob'); 

      const starterPet: Pixupet = {
          id: `starter_${Date.now()}`,
          dateCreated: Date.now(),
          name: pack.name,
          element: pack.element as any,
          rarity: 'Common',
          stage: 'Noob',
          rank: 'E',
          nature: 'Loyal',
          personality: 'Determined',
          visual_design: pack.visual_design,
          bodyType: pack.bodyType as any,
          potential: 3,
          hp: pack.stats.hp, maxHp: pack.stats.hp, currentHp: pack.stats.hp,
          atk: pack.stats.atk, def: pack.stats.def, spd: pack.stats.spd, int: 10,
          level: 1, exp: 0, maxExp: 100,
          hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 60,
          description: pack.description,
          ability: 'Overgrow',
          moves: [],
          voxelCode: makeBackgroundTransparent(voxel),
          cardArtUrl: art,
          imageSource: art
      };

      setInventory([starterPet]);
      setGameState('NEXUS');
  }

  if (gameState === 'SPLASH') {
      return (
          <div className="w-full h-screen flex flex-col items-center justify-center bg-yellow-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_0%,transparent_20%)] bg-[length:40px_40px] opacity-50"></div>
              <div className="z-10 text-center flex flex-col items-center">
                  <AnimatedLogo />
                  <div className="text-xl font-black text-black mb-8 bg-white px-6 py-2 border-4 border-black rounded-full inline-block shadow-[4px_4px_0_#000] rotate-1">
                      TURN ANYTHING INTO A PET
                  </div>
                  {user && inventory.length > 0 ? (
                      <PopButton label="RESUME" onClick={() => setGameState('NEXUS')} variant="primary" className="w-64 py-4 text-xl wiggle" />
                  ) : (
                      <PopButton label="NEW GAME" onClick={() => {
                          setUser({ name: 'Gamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), lastSaveAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: ['data_burger', 'potion_small'] });
                          setGameState('ONBOARDING');
                      }} variant="primary" className="w-64 py-4 text-xl wiggle" />
                  )}
              </div>
          </div>
      );
  }

  if (gameState === 'ONBOARDING') {
      return (
        <div className="w-full h-screen bg-indigo-200 flex flex-col items-center justify-center p-4 relative">
             <div className="z-10 flex flex-col items-center max-w-md w-full">
                <h1 className="text-3xl font-black mb-8 bg-white px-6 py-3 border-4 border-black shadow-[6px_6px_0_#000] rotate-1 text-center">HOW TO START?</h1>
                <div className="grid grid-cols-1 gap-6 w-full">
                    <PopButton label="CAMERA" subLabel="Scan any object." icon={ICONS.CAMERA} variant="action" onClick={() => fileInputRef.current?.click()} className="w-full py-6 text-xl shadow-[6px_6px_0_#000] hover:scale-105" />
                    <div className="text-center font-bold opacity-50">- OR -</div>
                    <PopButton label="PICK STARTER" subLabel="Choose a pre-made buddy." icon={ICONS.CARDS} variant="primary" onClick={() => setGameState('STARTER_SELECT')} className="w-full py-6 text-xl shadow-[6px_6px_0_#000] hover:scale-105" />
                </div>
             </div>
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
  }

  if (gameState === 'STARTER_SELECT') {
      return (
          <div className="w-full h-screen bg-blue-200 flex flex-col items-center justify-center p-4 overflow-y-auto">
              <h1 className="text-3xl font-black mb-6 bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_#000] rotate-1 sticky top-4 z-10">PICK YOUR BUDDY</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full pb-8">
                  {STARTER_PACKS.map(starter => (
                      <div key={starter.id} className="pop-card p-4 flex flex-col items-center bg-white cursor-pointer hover:scale-105 transition-transform" onClick={() => handleSelectStarter(starter.id)}>
                          <div className={`w-24 h-24 rounded-full border-4 border-black mb-4 flex items-center justify-center text-4xl ${ELEMENT_THEMES[starter.element].bg}`}>
                              {ELEMENT_THEMES[starter.element].icon}
                          </div>
                          <h2 className="text-xl font-black uppercase mb-2">{starter.name}</h2>
                          <p className="text-sm text-center text-gray-600 font-bold mb-4">{starter.description}</p>
                          <PopButton label="CHOOSE" onClick={() => handleSelectStarter(starter.id)} className="mt-4 w-full" />
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  if (gameState === 'SCAN') {
      return (
          <div className="w-full h-screen bg-yellow-200 flex flex-col items-center justify-center text-black">
              <div className="w-32 h-32 border-4 border-black rounded-full border-t-transparent animate-spin mb-8"></div>
              <div className="text-xl font-black bg-white px-4 py-2 border-2 border-black shadow-[4px_4px_0_#000]">SCANNING OBJECT...</div>
          </div>
      );
  }

  const activePet = inventory[0];

  return (
      <div className="w-full h-screen relative flex flex-col bg-yellow-50 text-black overflow-hidden">
          {/* HUD */}
          <div className="absolute top-0 w-full p-4 flex justify-between items-start z-30 pointer-events-none">
              <div className="pointer-events-auto flex flex-col gap-2">
                  <div className="pop-card px-3 py-1 text-sm font-bold bg-white border-2">
                      Lv.{activePet?.level || 1} • {user?.name}
                  </div>
                  <div className="pop-card px-3 py-1 text-sm font-bold bg-yellow-300 border-2">
                      💰 {user?.coins}
                  </div>
                  <div className="mt-2 text-xs font-bold text-gray-500 bg-white/80 p-2 rounded border-2 border-black max-w-[150px]">
                      {eventLog.map((l, i) => <div key={i} className="opacity-80">{l}</div>)}
                  </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                  <div className="pop-card px-3 py-1 text-xs font-black bg-white animate-pulse border-2 border-black">
                      {explorationStatus}
                  </div>
                  <div className="pointer-events-auto flex flex-col gap-2 mt-2">
                       <button onClick={() => setGameState('COLLECTION')} className="w-12 h-12 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0_#000] flex items-center justify-center hover:scale-105">
                          <NeonIcon path={ICONS.CARDS} size={20} />
                       </button>
                       <button onClick={() => setGameState('SHOP')} className="w-12 h-12 bg-yellow-300 border-2 border-black rounded-xl shadow-[3px_3px_0_#000] flex items-center justify-center hover:scale-105">
                          <NeonIcon path={ICONS.SHOP} size={20} />
                       </button>
                       <button onClick={() => setShowHints(true)} className="w-12 h-12 bg-blue-200 border-2 border-black rounded-xl shadow-[3px_3px_0_#000] flex items-center justify-center hover:scale-105">
                          <NeonIcon path={ICONS.HINT} size={20} />
                       </button>
                  </div>
              </div>
          </div>

          {/* MAIN SCENE */}
          {activePet ? (
              <div className="absolute inset-0 z-0">
                  <VoxelViewer code={activePet.voxelCode} mode="HABITAT" paused={gameState !== 'NEXUS'} />
                  
                  {/* Floating Pet Stats */}
                  <div className="pointer-events-auto">
                      <PetStatsPanel pet={activePet} />
                  </div>

                  <div className="absolute inset-0 pointer-events-none">
                      {floatingTexts.map(ft => (
                          <div key={ft.id} className={`absolute font-black text-2xl ${ft.color} float-up drop-shadow-md z-50`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>{ft.text}</div>
                      ))}
                  </div>
                  
                  {/* Pet Info Plate */}
                  <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                      <div className="pop-card px-6 py-2 bg-white inline-block pointer-events-auto">
                          <h2 className="text-xl font-black leading-none text-center">{activePet.name}</h2>
                          <div className="text-xs font-bold text-gray-500 text-center uppercase">{activePet.element} • {activePet.stage}</div>
                      </div>
                  </div>
              </div>
          ) : null}

          {/* BOTTOM CONTROLS */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto relative group -mt-4">
                 <PopButton label="" icon={ICONS.CAMERA} onClick={() => fileInputRef.current?.click()} variant="primary" className="h-20 w-20 rounded-full !p-0 flex items-center justify-center border-4 hover:scale-110 transition-transform" />
              </div>
          </div>

          {/* MODALS */}
          {showHints && <HintsModal onClose={() => setShowHints(false)} />}
          
          {activeBattle && inventory[0] && (
              <AutoBattleModal 
                  player={inventory[0]} 
                  enemy={activeBattle.enemy} 
                  logs={activeBattle.logs} 
                  onComplete={resolveBattle} 
              />
          )}

          {gameState === 'COLLECTION' && (
              <div className="absolute inset-0 bg-black/50 z-40 p-4 flex flex-col animate-pop-in backdrop-blur-sm">
                  <div className="bg-white border-4 border-black rounded-2xl flex-1 flex flex-col overflow-hidden shadow-[8px_8px_0_#000]">
                      <div className="flex justify-between items-center p-4 border-b-4 border-black bg-blue-200">
                          <h2 className="text-2xl font-black">MY COLLECTION</h2>
                          <PopButton label="X" onClick={() => setGameState('NEXUS')} className="!p-2 !h-8 !w-8" />
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto bg-gray-50 flex-1">
                          {inventory.map(p => (
                              <PixuCard key={p.id} pet={p} onClick={() => setSelectedCard(p)} selected={p.id === activePet?.id} />
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {selectedCard && (
              <CardDetailModal 
                  pet={selectedCard} 
                  onClose={() => setSelectedCard(null)} 
                  isEquipped={selectedCard.id === activePet?.id}
                  onEvolve={handleEvolve}
                  onEquip={() => {
                      const newInv = [selectedCard, ...inventory.filter(x => x.id !== selectedCard.id)];
                      setInventory(newInv);
                      setUser(u => u ? ({...u, inventory: u.inventory}) : null);
                      setSelectedCard(null);
                      setGameState('NEXUS');
                  }}
              />
          )}

          {gameState === 'SHOP' && (
               <div className="absolute inset-0 bg-black/50 z-40 p-4 flex flex-col animate-pop-in backdrop-blur-sm">
                   <div className="bg-white border-4 border-black rounded-2xl flex-1 flex flex-col overflow-hidden shadow-[8px_8px_0_#000]">
                       <div className="flex justify-between items-center p-4 border-b-4 border-black bg-yellow-300">
                          <h2 className="text-2xl font-black">ITEM SHOP</h2>
                          <PopButton label="X" onClick={() => setGameState('NEXUS')} className="!p-2 !h-8 !w-8" />
                      </div>
                      <div className="p-4 overflow-y-auto flex-1 bg-white">
                          <div className="space-y-2">
                              {Object.values(ITEMS_DB).map(item => (
                                  <div key={item.id} className="flex items-center justify-between bg-white border-2 border-black p-3 rounded-xl shadow-sm hover:bg-gray-50">
                                      <div className="flex items-center gap-3">
                                          <div className="text-3xl bg-gray-100 p-2 rounded-full border border-black">{item.icon}</div>
                                          <div>
                                              <div className="font-black text-sm">{item.name}</div>
                                              <div className="text-xs text-gray-500 font-bold">{item.description}</div>
                                              <div className="text-xs font-black mt-1">{item.price} G</div>
                                          </div>
                                      </div>
                                      <PopButton 
                                        disabled={(user?.coins || 0) < item.price} 
                                        onClick={() => {
                                            setUser({ ...user!, coins: (user?.coins||0) - item.price, inventory: [...(user?.inventory||[]), item.id] });
                                        }} 
                                        label="BUY" 
                                        className="text-xs !py-1 !px-3 h-8"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                   </div>
               </div>
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
