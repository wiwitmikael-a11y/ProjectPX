
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { generateVoxelScene, analyzeObject, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, MonsterStats, LOCATIONS_DB, LocationNode, STARTER_PACKS, determineEvolutionPath, EVO_THRESHOLDS, getProceduralMonsterArt, getRandomEventText } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'ONBOARDING' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'COLLECTION' | 'SHOP' | 'ITEMS' | 'EXPLORE';

const SAVE_VERSION = 'v8.0_MASSIVE_MAP'; 

interface UserProfile {
  name: string;
  level: number;
  exp: number;
  coins: number; 
  currentLocation: string; // Location ID
  joinedAt: number;
  inventory: string[]; // Item IDs
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

// --- ICONS ---
const ICONS = {
    CAMERA: "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 1,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 1,1 9,12A3,3 0 0,1 12,9Z",
    CARDS: "M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M13 13H17V17H13V13M7 7H11V11H7V7M7 13H11V17H7V13M13 7H17V11H13V7Z",
    SHOP: "M12 18H6V14H12M21 14V12L20 7H4L3 12V14H4V20H14V14H18V20H20V14M20 4H4V6H20V4Z",
    EXPLORE: "M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M12 6C9.79 6 8 7.79 8 10H10C10 8.9 10.9 8 12 8S14 8.9 14 10C14 12 11 11.75 11 15H13C13 12.75 16 12.5 16 10C16 7.79 14.21 6 12 6Z",
    ITEMS: "M20,6H16V4A2,2 0 0,0 14,2H10A2,2 0 0,0 8,4V6H4A2,2 0 0,0 2,8V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V8A2,2 0 0,0 20,6M10,4H14V6H10V4M20,20H4V8H8V10H10V8H14V10H16V8H20V20Z"
};

const NeonIcon: React.FC<{ path: string, size?: number, className?: string }> = ({ path, size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`${className}`}>
        <path d={path} />
    </svg>
);

const AnimatedLogo = () => {
    return (
        <div className="voxel-logo-container mb-4 text-6xl md:text-7xl">
            {"PIXUPET".split('').map((char, i) => (
                <span key={i} className="logo-char" style={{ animationDelay: `${i * 0.1}s` }}>{char}</span>
            ))}
        </div>
    );
};

const VoxelViewer = memo(({ code, onRef, className, mode = 'HABITAT', paused = false, theme = 'Neutral' }: { code: string, onRef?: any, className?: string, mode?: 'HABITAT'|'BATTLE', paused?: boolean, theme?: string }) => {
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
            iframe.contentWindow.postMessage({ type: 'PAUSE', value: paused }, '*');
            // DYNAMIC THEME INJECTION
            iframe.contentWindow.postMessage({ type: 'SET_THEME', value: theme }, '*');
        }
    }, [mode, paused, theme]);

    return (
        <iframe 
            ref={localRef}
            srcDoc={code} 
            className={`border-0 pointer-events-auto ${className || "w-full h-full"}`} 
            title="Voxel View"
            style={{ background: 'transparent', width: '100%', height: '100%', border: 'none' }} 
            scrolling="no" 
        />
    );
}, (prev, next) => prev.code === next.code && prev.mode === next.mode && prev.paused === next.paused && prev.theme === next.theme);

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
    const theme = ELEMENT_THEMES[pet.element];
    return (
        <div onClick={onClick} className={`tcg-card h-64 cursor-pointer ${selected ? 'ring-4 ring-blue-500 scale-105' : ''}`}>
            <div className="noise-overlay"></div>
            <div className={`h-10 ${theme.bg} flex items-center justify-between px-3 border-b-2 border-black z-20 relative`}>
                 <span className="text-xs font-black text-white uppercase tracking-wider">{pet.name}</span>
                 <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-black text-xs">{theme.icon}</div>
            </div>
            <div className="h-32 bg-gray-800 relative flex items-center justify-center overflow-hidden">
                 <img src={pet.cardArtUrl} className="w-full h-full object-cover opacity-90" alt={pet.name} />
                 <div className="absolute bottom-1 right-2 text-white text-[10px] font-bold bg-black/50 px-2 rounded-full">Lv.{pet.level}</div>
            </div>
            <div className="p-3 bg-white h-full relative z-10">
                 <div className="flex justify-between items-end mb-1">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">{pet.stage} Class</span>
                     <span className="text-[10px] font-black text-black">HP {pet.currentHp}/{pet.maxHp}</span>
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[9px] font-bold"><span className="w-4">ATK</span><div className="stat-bar-container"><div className="stat-bar-fill bg-red-500" style={{width: `${Math.min(100, pet.atk)}%`}}></div></div></div>
                    <div className="flex items-center gap-1 text-[9px] font-bold"><span className="w-4">DEF</span><div className="stat-bar-container"><div className="stat-bar-fill bg-blue-500" style={{width: `${Math.min(100, pet.def)}%`}}></div></div></div>
                 </div>
            </div>
        </div>
    );
}

// --- EXPLORATION MAP COMPONENT ---
const ExploreModal = ({ currentLocation, onTravel, playerLevel, onClose }: { currentLocation: string, onTravel: (id: string) => void, playerLevel: number, onClose: () => void }) => {
    // Find center to scroll to
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(scrollRef.current) {
            // Center roughly
            scrollRef.current.scrollTop = 300;
            scrollRef.current.scrollLeft = 100;
        }
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-pop-in">
            <div className="w-full max-w-4xl h-[90vh] bg-gray-900 border-4 border-black rounded-2xl shadow-[12px_12px_0_#000] flex flex-col overflow-hidden relative">
                <div className="h-16 bg-indigo-500 border-b-4 border-black flex items-center justify-between px-4 shrink-0 z-20 relative">
                    <h2 className="text-2xl font-black text-white">THE PIXUVERSE</h2>
                    <button onClick={onClose} className="w-10 h-10 bg-white border-2 border-black rounded-full font-black hover:bg-red-100">X</button>
                </div>
                
                {/* MAP SCROLL AREA */}
                <div ref={scrollRef} className="flex-1 relative overflow-auto bg-gray-800 map-grid cursor-move">
                    <div className="relative w-[200%] h-[200%] min-w-[800px] min-h-[800px]">
                        
                        {/* Connection Lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                            {Object.values(LOCATIONS_DB).map(loc => 
                                loc.connections.map(targetId => {
                                    const target = LOCATIONS_DB[targetId];
                                    if (!target) return null;
                                    return (
                                        <line key={`${loc.id}-${targetId}`} x1={`${loc.x}%`} y1={`${loc.y}%`} x2={`${target.x}%`} y2={`${target.y}%`} stroke="white" strokeWidth="4" strokeDasharray="10,10" />
                                    );
                                })
                            )}
                        </svg>

                        {/* Nodes */}
                        {Object.values(LOCATIONS_DB).map(loc => {
                            const isLocked = playerLevel < loc.levelReq;
                            const isCurrent = currentLocation === loc.id;
                            
                            return (
                                <button 
                                    key={loc.id}
                                    onClick={() => !isLocked && onTravel(loc.id)}
                                    disabled={isLocked || isCurrent}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 flex flex-col items-center justify-center rounded-xl border-4 border-black shadow-[6px_6px_0_#000] transition-all
                                        ${isCurrent ? 'bg-white scale-125 ring-8 ring-yellow-400 z-20' : isLocked ? 'bg-gray-600 opacity-70 grayscale cursor-not-allowed' : `${loc.color} hover:scale-110 z-10`}
                                    `}
                                    style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                                >
                                    <div className="text-2xl mb-1">{isLocked ? '🔒' : isCurrent ? '📍' : '🌎'}</div>
                                    <div className="text-[10px] font-black uppercase text-center leading-tight bg-black/20 px-1 rounded text-white">{loc.name}</div>
                                    {isLocked && <div className="text-[8px] font-bold text-red-300 mt-1">Lv.{loc.levelReq}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Location Info Panel */}
                <div className="h-36 bg-white border-t-4 border-black p-4 flex justify-between items-center z-20 relative">
                     <div>
                         <h3 className="text-xl font-black">{LOCATIONS_DB[currentLocation]?.name}</h3>
                         <p className="text-sm text-gray-600 font-bold">{LOCATIONS_DB[currentLocation]?.description}</p>
                         <div className="flex gap-2 mt-2">
                             <span className="text-xs bg-red-100 px-2 py-1 rounded border border-black font-bold">Danger: x{LOCATIONS_DB[currentLocation]?.difficultyMod}</span>
                             <span className="text-xs bg-yellow-100 px-2 py-1 rounded border border-black font-bold">Gold: x{LOCATIONS_DB[currentLocation]?.coinMod}</span>
                         </div>
                         <div className="mt-1 text-xs font-bold text-blue-600">Exclusive: {LOCATIONS_DB[currentLocation]?.exclusiveLoot?.join(", ")}</div>
                     </div>
                </div>
            </div>
        </div>
    );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  
  const [explorationStatus, setExplorationStatus] = useState<string>("EXPLORING...");
  const [activeBattle, setActiveBattle] = useState<{enemy: Pixupet, logs: string[]} | null>(null);
  const [selectedCard, setSelectedCard] = useState<Pixupet | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const savedUser = localStorage.getItem('pixupet_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      const savedInv = localStorage.getItem('pixupet_inventory');
      if (savedInv) setInventory(JSON.parse(savedInv));
  }, []);

  // --- SAFETY PROTOCOL: AUTO RETREAT ---
  useEffect(() => {
      if (user && inventory[0]) {
          const currentLoc = LOCATIONS_DB[user.currentLocation];
          if (currentLoc && inventory[0].level < currentLoc.levelReq) {
              // EMERGENCY RETREAT
              spawnFloatText("⚠️ DANGER LEVEL CRITICAL!", "text-red-600");
              spawnFloatText("EMERGENCY WARP!", "text-blue-500");
              setUser(u => u ? ({ ...u, currentLocation: 'loc_starter' }) : null);
          }
      }
  }, [user?.currentLocation, inventory[0]?.id]);

  // --- GAME LOOP: SCALED BY LOCATION ---
  useEffect(() => {
      if (gameState !== 'NEXUS' || !inventory[0] || activeBattle) return;
      
      const locId = user?.currentLocation || 'loc_starter';
      const loc = LOCATIONS_DB[locId];

      const timer = setInterval(() => {
          if (Math.random() > 0.7) { 
              const eventRoll = Math.random();
              
              if (eventRoll > 0.75) {
                  const loot = getLootDrop(locId);
                  if (loot) {
                      const item = ITEMS_DB[loot];
                      setUser(u => u ? ({...u, inventory: [...u.inventory, loot], coins: u.coins + Math.floor(10 * loc.coinMod) }) : null);
                      spawnFloatText(`+ ${item.name}`, "text-green-600");
                  }
              } else if (eventRoll > 0.45) {
                  const enemy = getRandomEnemy(locId, inventory[0].level, getGenericVoxel);
                  setExplorationStatus("COMBAT!");
                  startAutoBattle(enemy);
              } else {
                  const txt = getRandomEventText(locId);
                  setExplorationStatus(txt);
              }
          }
      }, 3000);

      return () => clearInterval(timer);
  }, [gameState, inventory, activeBattle, user?.currentLocation]);

  const startAutoBattle = (enemy: Pixupet) => {
      const player = inventory[0];
      let logs = [`Wild ${enemy.name} appeared!`];
      setActiveBattle({ enemy, logs });
      
      let pHP = player.currentHp || 100;
      let eHP = enemy.hp;
      let round = 0;
      const battleSteps: string[] = [];

      while (pHP > 0 && eHP > 0 && round < 8) {
          const pDmg = Math.floor(player.atk * (1 + Math.random()));
          eHP -= pDmg;
          battleSteps.push(`You hit for ${pDmg}!`);
          if (eHP <= 0) { battleSteps.push(`WIN: Enemy KO!`); break; }

          const eDmg = Math.floor(enemy.atk * (1 + Math.random() * 0.5));
          pHP -= eDmg;
          battleSteps.push(`Enemy hit for ${eDmg}.`);
          if (pHP <= 0) { battleSteps.push(`LOSE: You fainted.`); break; }
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
          const loc = LOCATIONS_DB[user?.currentLocation || 'loc_starter'];
          const coins = Math.floor(50 * loc.coinMod);
          const xp = Math.floor(40 * loc.difficultyMod);
          
          const pet = inventory[0];
          let updatedPet = { ...pet, exp: pet.exp + xp };
          if (updatedPet.exp >= updatedPet.maxExp) {
              updatedPet.level++; updatedPet.exp=0; updatedPet.maxExp = Math.floor(updatedPet.maxExp * 1.2);
              updatedPet.atk+=2; updatedPet.maxHp!+=10; updatedPet.currentHp = updatedPet.maxHp;
              spawnFloatText("LEVEL UP!", "text-yellow-600");
          }

          setUser(u => u ? ({...u, coins: u.coins + coins }) : null);
          setInventory([updatedPet, ...inventory.slice(1)]);
          spawnFloatText(`+${coins} Gold`, "text-yellow-600");
      }
  };

  const spawnFloatText = (text: string, color: string) => {
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
          const newPet: Pixupet = { ...stats, voxelCode: code, imageSource: art, cardArtUrl: art, currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100, hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 50 };
          
          // Safe Spawn Logic: Move to starter zone if level is 1
          setUser(u => u ? ({ ...u, currentLocation: 'loc_starter' }) : null);
          
          setInventory([newPet, ...inventory]);
          setTimeout(() => setGameState('NEXUS'), 2000);
      } catch (e) { setGameState('NEXUS'); }
  };

  const handleSelectStarter = (starterId: string) => {
      const pack = STARTER_PACKS.find(s => s.id === starterId);
      if (!pack) return;
      const art = getProceduralMonsterArt(pack.name, pack.element);
      const voxel = getGenericVoxel(pack.element, pack.bodyType, 'Noob'); 
      const starter: Pixupet = { ...pack, id: `starter_${Date.now()}`, dateCreated: Date.now(), rarity: 'Common', stage: 'Noob', rank: 'E', nature: 'Loyal', potential: 3, int: 10, level: 1, exp: 0, maxExp: 100, hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 60, ability: 'Overgrow', moves: [], voxelCode: voxel, cardArtUrl: art, imageSource: art } as any;
      
      // Safe Spawn
      setUser(u => u ? ({ ...u, currentLocation: 'loc_starter' }) : null);
      
      setInventory([starter]);
      setGameState('NEXUS');
  };

  const handleTravel = (locId: string) => {
      setUser(u => u ? ({ ...u, currentLocation: locId }) : null);
      spawnFloatText("Traveled!", "text-white");
      setGameState('NEXUS');
  };
  
  const handleEvolve = async () => {
      const pet = inventory[0];
      if (!pet) return;
      const evo = await evolveVoxelScene(pet);
      const updatedPet = {
          ...pet,
          voxelCode: evo.code,
          stage: evo.nextStage,
          name: evo.nextName,
          visual_design: evo.visual_design,
          atk: pet.atk + 10,
          def: pet.def + 10,
          maxHp: (pet.maxHp || 100) + 50,
          currentHp: (pet.maxHp || 100) + 50
      };
      setInventory([updatedPet, ...inventory.slice(1)]);
      spawnFloatText("EVOLUTION!", "text-purple-500");
      setShowStats(false);
  };

  // --- RENDERING ---
  if (gameState === 'SPLASH') return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-yellow-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_0%,transparent_20%)] bg-[length:40px_40px] opacity-50"></div>
          <div className="z-10 text-center flex flex-col items-center">
              <AnimatedLogo />
              <div className="text-xl font-black text-black mb-8 bg-white px-6 py-2 border-4 border-black rounded-full inline-block shadow-[4px_4px_0_#000] rotate-1">TURN ANYTHING INTO A PET</div>
              <PopButton label={user ? "RESUME" : "NEW GAME"} onClick={() => user ? setGameState('NEXUS') : setGameState('ONBOARDING')} variant="primary" className="w-64 py-4 text-xl wiggle" />
          </div>
      </div>
  );

  if (gameState === 'ONBOARDING') return (
        <div className="w-full h-screen bg-indigo-200 flex flex-col items-center justify-center p-4 relative">
             <div className="z-10 flex flex-col items-center max-w-md w-full">
                <h1 className="text-3xl font-black mb-8 bg-white px-6 py-3 border-4 border-black shadow-[6px_6px_0_#000] rotate-1 text-center">HOW TO START?</h1>
                <div className="grid grid-cols-1 gap-6 w-full">
                    <PopButton label="CAMERA" subLabel="Scan any object." icon={ICONS.CAMERA} variant="action" onClick={() => { setUser({ name: 'Gamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), inventory: ['pixel_pizza'], currentLocation: 'loc_starter', currentRank: 'E' }); fileInputRef.current?.click(); }} className="w-full py-6 text-xl shadow-[6px_6px_0_#000]" />
                    <PopButton label="PICK STARTER" subLabel="Choose a buddy." icon={ICONS.CARDS} variant="primary" onClick={() => { setUser({ name: 'Gamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), inventory: ['pixel_pizza'], currentLocation: 'loc_starter', currentRank: 'E' }); setGameState('STARTER_SELECT'); }} className="w-full py-6 text-xl shadow-[6px_6px_0_#000]" />
                </div>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => handleScan(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
        </div>
  );

  if (gameState === 'STARTER_SELECT') return (
      <div className="w-full h-screen bg-blue-200 flex flex-col items-center p-4 overflow-y-auto">
          <h1 className="text-3xl font-black mb-6 bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_#000] rotate-1 sticky top-4 z-10">PICK YOUR BUDDY</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full pb-8 mt-4">
              {STARTER_PACKS.map(starter => (
                  <div key={starter.id} className="pop-card p-4 flex flex-col items-center bg-white cursor-pointer hover:scale-105 transition-transform" onClick={() => handleSelectStarter(starter.id)}>
                      <div className={`w-24 h-24 rounded-full border-4 border-black mb-4 flex items-center justify-center text-4xl ${ELEMENT_THEMES[starter.element].bg}`}>{ELEMENT_THEMES[starter.element].icon}</div>
                      <h2 className="text-xl font-black uppercase mb-2">{starter.name}</h2>
                      <p className="text-sm text-center text-gray-600 font-bold mb-4">{starter.description}</p>
                      <PopButton label="CHOOSE" onClick={() => handleSelectStarter(starter.id)} className="mt-4 w-full" />
                  </div>
              ))}
          </div>
      </div>
  );

  if (gameState === 'SCAN') return (
      <div className="w-full h-screen bg-yellow-200 flex flex-col items-center justify-center text-black">
          <div className="w-32 h-32 border-8 border-black rounded-full border-t-transparent animate-spin mb-8"></div>
          <div className="text-2xl font-black bg-white px-6 py-3 border-4 border-black shadow-[6px_6px_0_#000] rotate-2">SCANNING OBJECT...</div>
      </div>
  );

  // --- MAIN GAME ---
  return (
      <div className="w-full h-screen flex flex-col bg-gray-100 overflow-hidden font-sans text-black">
          {/* TOP BAR */}
          <div className="h-16 bg-white border-b-4 border-black flex items-center justify-between px-4 shrink-0 z-30 relative shadow-md">
              <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-300 border-2 border-black rounded-full flex items-center justify-center text-xl font-black">{user?.name.charAt(0)}</div>
                  <div className="flex flex-col leading-none">
                      <span className="font-black text-sm">{user?.name}</span>
                      <span className="text-xs font-bold text-gray-500">{LOCATIONS_DB[user?.currentLocation || 'loc_starter']?.name}</span>
                  </div>
              </div>
              <div className="bg-yellow-100 border-2 border-black px-3 py-1 rounded-full font-black text-sm">💰 {user?.coins}</div>
          </div>

          {/* 3D VIEW */}
          <div className="flex-1 relative bg-gradient-to-b from-blue-200 to-white overflow-hidden">
              {inventory[0] ? (
                  <>
                      <VoxelViewer 
                        code={inventory[0].voxelCode} 
                        mode="HABITAT" 
                        paused={gameState !== 'NEXUS'} 
                        theme={LOCATIONS_DB[user?.currentLocation || 'loc_starter']?.enemyTheme?.[0] || 'Neutral'}
                        className="w-full h-full absolute inset-0" 
                      />
                      <div className="absolute inset-0 pointer-events-none z-20">
                          {floatingTexts.map(ft => <div key={ft.id} className={`absolute font-black text-3xl ${ft.color} float-up drop-shadow-[2px_2px_0_#000]`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>{ft.text}</div>)}
                      </div>
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10 cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowStats(true)}>
                          <div className="pop-card px-8 py-2 bg-white shadow-xl text-center relative">
                              <div className="absolute -top-3 -right-3 bg-blue-500 text-white w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-serif italic font-black">i</div>
                              <h2 className="text-2xl font-black uppercase">{inventory[0].name}</h2>
                              <div className="text-xs font-bold text-gray-500">{inventory[0].element} • {inventory[0].stage}</div>
                          </div>
                      </div>
                      <div className="absolute top-4 left-4 pointer-events-none">
                          <div className="bg-white/80 backdrop-blur border-2 border-black px-3 py-1 rounded-lg text-xs font-black animate-pulse uppercase">{explorationStatus}</div>
                      </div>
                      
                      {/* ACTIVE BATTLE POPUP (3D) */}
                      {activeBattle && (
                          <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-pop-in">
                              <div className="w-11/12 h-4/5 bg-gray-900 border-4 border-black rounded-2xl shadow-[10px_10px_0_#000] flex flex-col overflow-hidden relative">
                                   <div className="h-1/2 relative bg-gradient-to-b from-red-900 to-black">
                                       <VoxelViewer code={activeBattle.enemy.voxelCode} mode="BATTLE" className="w-full h-full" />
                                       <div className="absolute top-4 right-4 text-white text-right">
                                           <div className="text-xl font-black">{activeBattle.enemy.name}</div>
                                           <div className="text-sm text-red-400">Lv.{activeBattle.enemy.level} {activeBattle.enemy.stage}</div>
                                       </div>
                                   </div>
                                   <div className="flex-1 bg-white p-4 font-mono text-xs overflow-y-auto flex flex-col-reverse border-t-4 border-black">
                                        {activeBattle.logs.map((l, i) => (
                                            <div key={i} className={`mb-1 font-bold ${l.includes('WIN') ? 'text-green-600 text-lg' : l.includes('LOSE') ? 'text-red-600 text-lg' : 'text-gray-800'} animate-fade-in`}>{l}</div>
                                        ))}
                                   </div>
                                   <div className="p-4 bg-gray-100 border-t-2 border-black flex justify-center">
                                       {activeBattle.logs[activeBattle.logs.length-1]?.includes('WIN') || activeBattle.logs[activeBattle.logs.length-1]?.includes('LOSE') ? 
                                          <PopButton label="CONTINUE" onClick={() => resolveBattle(activeBattle.logs[activeBattle.logs.length-1].includes('WIN'))} variant="primary" /> :
                                          <div className="text-gray-400 font-black animate-pulse">FIGHTING...</div>
                                       }
                                   </div>
                              </div>
                          </div>
                      )}

                      {/* PET STATS DETAIL OVERLAY */}
                      {showStats && (
                          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowStats(false)}>
                              <div className="bg-white w-full max-w-md rounded-2xl border-4 border-black p-4 shadow-[8px_8px_0_white] relative" onClick={e => e.stopPropagation()}>
                                   <div className="absolute -top-6 -left-4 -rotate-6 bg-yellow-300 px-4 py-1 border-4 border-black font-black text-xl shadow-md">STATS</div>
                                   <div className="flex justify-between items-start mb-4 mt-2">
                                       <div>
                                           <h2 className="text-3xl font-black uppercase">{inventory[0].name}</h2>
                                           <div className="font-bold text-gray-500">Level {inventory[0].level} • {inventory[0].nature} Nature</div>
                                       </div>
                                       <div className={`text-4xl ${ELEMENT_THEMES[inventory[0].element].text} drop-shadow-md`}>{ELEMENT_THEMES[inventory[0].element].icon}</div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4 mb-4">
                                       <div className="bg-gray-100 p-2 rounded border-2 border-black">
                                           <div className="text-xs font-bold text-gray-400">ATTACK</div>
                                           <div className="text-xl font-black">{inventory[0].atk}</div>
                                       </div>
                                       <div className="bg-gray-100 p-2 rounded border-2 border-black">
                                           <div className="text-xs font-bold text-gray-400">DEFENSE</div>
                                           <div className="text-xl font-black">{inventory[0].def}</div>
                                       </div>
                                       <div className="bg-gray-100 p-2 rounded border-2 border-black">
                                           <div className="text-xs font-bold text-gray-400">SPEED</div>
                                           <div className="text-xl font-black">{inventory[0].spd}</div>
                                       </div>
                                       <div className="bg-gray-100 p-2 rounded border-2 border-black">
                                           <div className="text-xs font-bold text-gray-400">HAPPINESS</div>
                                           <div className="text-xl font-black">{inventory[0].happiness}%</div>
                                       </div>
                                   </div>
                                   
                                   {/* EVOLUTION SECTION */}
                                   {(inventory[0].level >= EVO_THRESHOLDS.PRO && inventory[0].stage === 'Noob') || 
                                    (inventory[0].level >= EVO_THRESHOLDS.ELITE && inventory[0].stage === 'Pro') || 
                                    (inventory[0].level >= EVO_THRESHOLDS.LEGEND && inventory[0].stage === 'Elite') ? (
                                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4">
                                            <div className="text-center font-black text-purple-600 mb-2 animate-pulse">EVOLUTION AVAILABLE!</div>
                                            <PopButton label="EVOLVE NOW" variant="action" onClick={handleEvolve} className="w-full" />
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs text-gray-400 font-bold mt-4">Next Evolution at Lv.{inventory[0].stage === 'Noob' ? 10 : inventory[0].stage === 'Pro' ? 25 : 50}</div>
                                    )}
                              </div>
                          </div>
                      )}

                  </>
              ) : <div className="flex items-center justify-center h-full text-gray-400 font-bold">No Pet Selected</div>}
          </div>

          {/* BOTTOM NAV */}
          <div className="h-20 bg-white border-t-4 border-black flex items-center justify-around px-2 shrink-0 z-30 relative shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <button onClick={() => setGameState('COLLECTION')} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-xl w-16"><NeonIcon path={ICONS.CARDS} size={24} /><span className="text-[10px] font-black">CARDS</span></button>
              <button onClick={() => setGameState('ITEMS')} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-xl w-16"><NeonIcon path={ICONS.ITEMS} size={24} /><span className="text-[10px] font-black">ITEMS</span></button>
              <div className="-mt-12 relative"><button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-blue-400 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_#000] hover:translate-y-1 hover:shadow-none transition-all"><NeonIcon path={ICONS.CAMERA} size={36} className="text-white" /></button></div>
              <button onClick={() => setGameState('SHOP')} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-xl w-16"><NeonIcon path={ICONS.SHOP} size={24} /><span className="text-[10px] font-black">SHOP</span></button>
              {/* REPLACED GUIDE WITH EXPLORE */}
              <button onClick={() => setGameState('EXPLORE')} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-xl w-16"><NeonIcon path={ICONS.EXPLORE} size={24} /><span className="text-[10px] font-black">EXPLORE</span></button>
          </div>

          {/* MODALS */}
          {gameState === 'EXPLORE' && user && <ExploreModal currentLocation={user.currentLocation} playerLevel={inventory[0]?.level || 1} onTravel={handleTravel} onClose={() => setGameState('NEXUS')} />}
          
          {gameState === 'COLLECTION' && (
              <div className="absolute inset-0 z-40 bg-white flex flex-col animate-pop-in">
                  <div className="h-16 bg-blue-500 border-b-4 border-black flex items-center justify-between px-4 shrink-0"><h2 className="text-2xl font-black text-white drop-shadow-md">MY PETS</h2><button onClick={() => setGameState('NEXUS')} className="w-10 h-10 bg-white border-2 border-black rounded-full font-black hover:bg-red-100">X</button></div>
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-900"><div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">{inventory.map(p => <PixuCard key={p.id} pet={p} onClick={() => setSelectedCard(p)} selected={p.id === inventory[0]?.id} />)}</div></div>
              </div>
          )}

          {gameState === 'ITEMS' && (
              <div className="absolute inset-0 z-40 bg-white flex flex-col animate-pop-in">
                  <div className="h-16 bg-purple-500 border-b-4 border-black flex items-center justify-between px-4 shrink-0"><h2 className="text-2xl font-black text-white drop-shadow-md">INVENTORY</h2><button onClick={() => setGameState('NEXUS')} className="w-10 h-10 bg-white border-2 border-black rounded-full font-black hover:bg-red-100">X</button></div>
                  <div className="flex-1 overflow-y-auto p-4 bg-purple-50 pb-20 space-y-3">
                      {user?.inventory.length ? Array.from(new Set(user.inventory)).map((id: string) => { const item = ITEMS_DB[id]; const count = user!.inventory.filter(i => i === id).length; if(!item) return null; return (
                          <div key={item.id} className="flex items-center justify-between bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0_#000]">
                              <div className="flex items-center gap-4"><div className="text-4xl bg-gray-100 p-3 rounded-xl border-2 border-black">{item.icon}</div><div><div className="font-black text-lg">{item.name} <span className="text-sm text-gray-500">x{count}</span></div><div className="text-xs text-gray-600 font-bold">{item.description}</div></div></div>
                              {item.type === 'Food' || item.type === 'Consumable' ? <PopButton label="USE" className="!py-2 !px-4 h-10" onClick={() => { if (inventory[0] && item.effect) { const up = item.effect({...inventory[0]}); setInventory(inv => inv.map(p => p.id === inventory[0].id ? up : p)); spawnFloatText("Used!", "text-green-500"); } const ni = [...user.inventory]; ni.splice(ni.indexOf(id), 1); setUser({...user, inventory: ni}); }} /> : null}
                          </div>
                      )}) : <div className="text-center font-bold text-gray-400 mt-10">Empty.</div>}
                  </div>
              </div>
          )}

          {/* HIDDEN INPUT */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => handleScan(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); e.target.value = ''; } }} />
      </div>
  );
};

export default App;
