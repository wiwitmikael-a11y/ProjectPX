
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { generateVoxelScene, analyzeObject, MonsterStats, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, AITactic, calculateOfflineProgress, OfflineReport, EVO_THRESHOLDS, MonsterStage, determineEvolutionPath } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'NEXUS' | 'SCAN' | 'DATABASE' | 'ARENA' | 'SYNTHESIS' | 'TRAINING' | 'SHOP' | 'EVOLUTION';
type EventType = 'WILD_BATTLE' | 'TREASURE' | 'MERCHANT';
type BattleCommand = 'ATTACK' | 'DEFEND' | 'CHARGE' | 'OVERCLOCK';

const SAVE_VERSION = 'v4.0_CYBER'; 

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

// --- CONSTANTS & ICONS ---
const ICONS = {
    SCAN: "M3,10 L5,10 L5,16 L11,16 L11,18 L3,18 L3,10 Z M13,18 L19,18 L19,16 L21,16 L21,18 L21,21 L13,21 L13,18 Z M19,8 L21,8 L21,3 L13,3 L13,5 L19,5 L19,8 Z M3,3 L11,3 L11,5 L5,5 L5,8 L3,8 L3,3 Z",
    NEXUS: "M4,10 L4,20 L20,20 L20,10 L12,4 Z M12,22 C6.48,22 2,17.52 2,12 C2,6.48 6.48,2 12,2 C17.52,2 22,6.48 22,12 C22,17.52 17.52,22 12,22 Z",
    DATABASE: "M4,6H20V18H4V6M4,2A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4A2,2 0 0,0 20,2H4Z",
    SWORD: "M6,2L2,6L6,10L10,6L6,2M6,16L2,20L6,24L10,20L6,16M20,6L16,2L12,6L16,10L20,6M16,16L12,20L16,24L20,20L16,16M9,12L12,9L15,12L12,15L9,12Z",
    SHOP: "M4,4H20V6H4V4M4,9H20V19H4V9M6,12V16H8V12H6M10,12V16H12V12H10M14,12V16H16V12H14M2,2V22H22V2H2Z",
    TRAIN: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6V12L16.24,16.24L14.83,17.66L9,11.83V6H12Z"
};

// --- SHARED COMPONENTS ---

const NeonIcon: React.FC<{ path: string, size?: number, className?: string }> = ({ path, size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`${className}`}>
        <path d={path} />
    </svg>
);

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
            iframe.contentWindow.postMessage({ type: 'PAUSE', value: paused }, '*');
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

const CyberButton: React.FC<{ label?: string, icon?: string, onClick: () => void, variant?: 'primary' | 'danger' | 'warning' | 'default', disabled?: boolean, className?: string }> = ({ label, icon, onClick, variant = 'default', disabled, className = "" }) => (
    <button onClick={onClick} disabled={disabled} className={`cyber-btn ${variant} px-4 py-2 flex items-center justify-center gap-2 ${className}`}>
        {icon && <NeonIcon path={icon} size={18} />}
        {label}
    </button>
);

const ProtocolMonitor = ({ pet, minimal }: { pet: Pixupet, minimal?: boolean }) => {
    const { protocolName, color, borderColor, icon, dominant, desc } = determineEvolutionPath({ 
        atk: pet.atk, 
        def: pet.def, 
        spd: pet.spd, 
        happiness: pet.happiness || 50 
    });

    if (minimal) {
         return <div className={`text-xs font-bold ${color} border ${borderColor} px-1`}>{icon} {protocolName}</div>
    }

    return (
        <div className={`bg-black/80 backdrop-blur border-l-4 ${borderColor} p-3 w-full mb-2`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 tracking-widest uppercase">EVO PREDICTION</span>
                <span className={`text-xs font-black ${color}`}>{icon} {protocolName}</span>
            </div>
            <div className="text-[10px] text-gray-300 mb-2">{desc}</div>
            
            {/* Stat Bars */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-[8px] w-6 text-red-500">ATK</span>
                    <div className="flex-1 h-1 bg-gray-800"><div className="h-full bg-red-500" style={{width: `${Math.min(100, pet.atk)}%`}}></div></div>
                    <span className="text-[8px] text-gray-500">{pet.atk}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] w-6 text-slate-400">DEF</span>
                    <div className="flex-1 h-1 bg-gray-800"><div className="h-full bg-slate-400" style={{width: `${Math.min(100, pet.def)}%`}}></div></div>
                    <span className="text-[8px] text-gray-500">{pet.def}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] w-6 text-blue-400">SPD</span>
                    <div className="flex-1 h-1 bg-gray-800"><div className="h-full bg-blue-400" style={{width: `${Math.min(100, pet.spd)}%`}}></div></div>
                    <span className="text-[8px] text-gray-500">{pet.spd}</span>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ---

const App: React.FC = () => {
  // STATE
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  
  // BATTLE STATE
  const [playerPet, setPlayerPet] = useState<Pixupet | null>(null);
  const [enemyPet, setEnemyPet] = useState<Pixupet | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleCommand, setBattleCommand] = useState<BattleCommand | null>(null);
  
  // UI STATE
  const [screenShake, setScreenShake] = useState(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  const [scanMessage, setScanMessage] = useState<string>("INITIALIZING SCANNER...");
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INIT ---
  useEffect(() => {
      const currentVersion = localStorage.getItem('pixupet_version');
      if (currentVersion !== SAVE_VERSION) {
          // Wipe for new version compatibility
          localStorage.clear();
          localStorage.setItem('pixupet_version', SAVE_VERSION);
      } else {
          const savedUser = localStorage.getItem('pixupet_user');
          const savedInv = localStorage.getItem('pixupet_inventory');
          if (savedUser && savedInv) {
              const u = JSON.parse(savedUser);
              const inv = JSON.parse(savedInv);
              
              // Offline Calculation
              if (u.lastSaveAt && inv.length > 0) {
                  const report = calculateOfflineProgress(inv[0], u.lastSaveAt);
                  // Apply report
                  inv[0].exp += report.xpGained;
                  if(inv[0].exp >= inv[0].maxExp) {
                      inv[0].level++; inv[0].exp=0; inv[0].maxExp = Math.floor(inv[0].maxExp * 1.2);
                      inv[0].atk+=2; inv[0].maxHp+=5; inv[0].hp+=5;
                  }
                  u.coins += report.coinsFound;
                  setOfflineReport(report);
              }
              setUser(u);
              setInventory(inv);
              setGameState('NEXUS');
          }
      }
  }, []);

  // SAVE LOOP
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

  // --- HELPERS ---
  const triggerShake = () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
  };

  const spawnFloatText = (text: string, color: string = "text-white") => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, text, x: 50, y: 40, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  const saveGame = (u: UserProfile, i: Pixupet[]) => {
      setUser(u);
      setInventory(i);
      localStorage.setItem('pixupet_user', JSON.stringify(u));
      localStorage.setItem('pixupet_inventory', JSON.stringify(i));
  };

  // --- ACTIONS ---

  const handleScan = async (img: string) => {
      setGameState('SCAN');
      try {
          const stats = await analyzeObject(img);
          let code = await generateVoxelScene(img, stats.visual_design, stats.bodyType);
          code = makeBackgroundTransparent(zoomCamera(hideBodyText(code), 0.9));
          
          // Generate Art asynchronously
          generateCardArt(stats.description, stats.name, stats.visual_design)
             .then(url => {
                 setInventory(curr => curr.map(p => p.id === newPet.id ? {...p, cardArtUrl: url} : p));
             });

          const newPet: Pixupet = {
              ...stats, voxelCode: code, imageSource: img, cardArtUrl: img,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 50
          };
          
          // Add to inventory
          const newInv = [newPet, ...inventory];
          saveGame(user!, newInv);
          setTimeout(() => setGameState('NEXUS'), 2000);
      } catch (e) {
          alert("Scan Error. Signal lost.");
          setGameState('NEXUS');
      }
  };

  const handleCreateProfile = () => {
      const u: UserProfile = { name: 'Tamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), lastSaveAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: ['data_burger', 'potion_small'] };
      saveGame(u, []);
      setGameState('NEXUS');
  };

  const handleFeed = (itemId: string) => {
      const item = ITEMS_DB[itemId];
      const pet = inventory[0];
      if (!item) return;
      
      let newPet = { ...pet };
      // Item Effect Logic
      if (item.type === 'Driver') {
          // Drivers are special, they don't consume hunger usually but mod stats
          spawnFloatText("PROTOCOL UPDATED", "text-purple-400");
      } else {
          if (pet.hunger >= 100 && item.type === 'Food') { spawnFloatText("FULL!", "text-red-500"); return; }
      }

      if (item.effect) newPet = item.effect(newPet);
      
      // Remove Item
      const invList = [...user!.inventory];
      const idx = invList.indexOf(itemId);
      if (idx > -1) invList.splice(idx, 1);
      
      const newUser = { ...user!, inventory: invList };
      const newInv = [newPet, ...inventory.slice(1)];
      saveGame(newUser, newInv);
      spawnFloatText(`${item.name} Used`, "text-green-400");
  };

  const handleEvolve = async () => {
      const pet = inventory[0];
      if (!pet) return;
      const confirmed = window.confirm(`Initialize Evolution Protocol? This will rewrite ${pet.name}'s core code.`);
      if (!confirmed) return;

      setGameState('SCAN');
      setScanMessage("REWRITING DNA SEQUENCE...");
      
      try {
          const result = await evolveVoxelScene(pet);
          const newArt = await generateCardArt(result.visual_design, result.nextName, result.visual_design);
          
          const evolvedPet: Pixupet = {
              ...pet,
              visual_design: result.visual_design,
              voxelCode: makeBackgroundTransparent(result.code),
              cardArtUrl: newArt,
              name: result.nextName,
              stage: result.nextStage,
              atk: pet.atk + 15, def: pet.def + 15, spd: pet.spd + 15,
              maxHp: (pet.maxHp||100) + 50, currentHp: (pet.maxHp||100) + 50,
          };
          
          const newInv = [evolvedPet, ...inventory.slice(1)];
          saveGame(user!, newInv);
          setGameState('NEXUS');
          alert(`Evolution Complete: ${result.nextName} (${result.nextStage})`);
      } catch (e) {
          setGameState('NEXUS');
          alert("Evolution Failed. System Unstable.");
      }
  };

  // --- BATTLE LOGIC ---
  const startBattle = (type: 'WILD' | 'ARENA', target?: Pixupet) => {
      const p = inventory[0];
      if (!p || (p.currentHp || 0) <= 0) { alert("Pet Critical! Heal required."); return; }
      
      // Hunger Cost
      if (p.hunger < 10) { alert("Not enough energy (Hunger) to fight!"); return; }
      const newPet = { ...p, hunger: p.hunger - 5 };
      setInventory([newPet, ...inventory.slice(1)]);
      setPlayerPet(newPet);

      // Enemy Setup
      const enemy = target || getRandomEnemy(user?.currentRank || 'E', p.level);
      const enemyVoxel = getGenericVoxel(enemy.element);
      setEnemyPet({ ...enemy, voxelCode: makeBackgroundTransparent(enemyVoxel), currentHp: enemy.hp });

      setBattleLog(["COMBAT INITIALIZED", `TARGET: ${enemy.name}`]);
      setIsBattleOver(false);
      setBattleCommand(null);
      setGameState('ARENA');
  };

  useEffect(() => {
      if (gameState === 'ARENA' && !isBattleOver && battleCommand && playerPet && enemyPet) {
          const turn = async () => {
              // PLAYER TURN
              let pDmg = 0;
              let log = "";
              let isDefending = false;
              let ocMult = 1;

              if (battleCommand === 'OVERCLOCK') {
                  if (playerPet.hunger >= 20) {
                      ocMult = 2.5;
                      setPlayerPet(curr => curr ? ({...curr, hunger: curr.hunger - 20}) : null);
                      log = ">> SYSTEM OVERCLOCK! ";
                  } else {
                      log = ">> OVERCLOCK FAILED (LOW ENERGY). ";
                  }
              }

              if (battleCommand === 'ATTACK' || battleCommand === 'OVERCLOCK') {
                  pDmg = Math.max(5, Math.floor((playerPet.atk * 0.5) - (enemyPet.def * 0.2)));
                  if (Math.random() < 0.1) { pDmg *= 2; log += "CRIT! "; }
                  pDmg = Math.floor(pDmg * ocMult);
                  log += `${playerPet.name} attacks for ${pDmg}!`;
                  
                  const newHp = Math.max(0, (enemyPet.currentHp||0) - pDmg);
                  setEnemyPet(curr => curr ? ({...curr, currentHp: newHp}) : null);
                  triggerShake();
                  
                  if (newHp <= 0) {
                      setBattleLog(prev => ["TARGET DESTROYED", log, ...prev]);
                      setIsBattleOver(true);
                      // Win Logic
                      const xp = 50;
                      const coins = 40;
                      const loot = getLootDrop(user?.currentRank||'E');
                      
                      let updatedPet = { ...playerPet, exp: playerPet.exp + xp, battlesWon: (user?.battlesWon||0)+1 };
                      if (updatedPet.exp >= updatedPet.maxExp) {
                          updatedPet.level++; updatedPet.exp=0; updatedPet.maxExp*=1.2;
                          updatedPet.atk+=2; updatedPet.maxHp!+=10; updatedPet.hp+=10; updatedPet.currentHp = updatedPet.maxHp;
                      }
                      
                      const newInv = [updatedPet, ...inventory.slice(1)];
                      let newUser = { ...user!, coins: user!.coins + coins };
                      if (loot) {
                          newUser.inventory.push(loot);
                          setBattleLog(prev => [`LOOT: ${ITEMS_DB[loot].name}`, ...prev]);
                      }
                      
                      saveGame(newUser, newInv);
                      return;
                  }
              } else if (battleCommand === 'DEFEND') {
                  isDefending = true;
                  log = "Defensive Stance.";
              }
              setBattleLog(prev => [log, ...prev]);

              // DELAY ENEMY TURN
              await new Promise(r => setTimeout(r, 1000));
              
              // ENEMY TURN
              let eDmg = Math.max(2, Math.floor((enemyPet.atk * 0.5) - (playerPet.def * 0.2)));
              if (isDefending) eDmg = Math.floor(eDmg * 0.5);
              
              const pNewHp = Math.max(0, (playerPet.currentHp||0) - eDmg);
              setPlayerPet(curr => curr ? ({...curr, currentHp: pNewHp}) : null);
              setBattleLog(prev => [`Enemy hits for ${eDmg}`, ...prev]);

              if (pNewHp <= 0) {
                  setIsBattleOver(true);
                  setBattleLog(prev => ["SIGNAL LOST...", ...prev]);
                  const updatedPet = { ...playerPet, currentHp: 0 };
                  const newInv = [updatedPet, ...inventory.slice(1)];
                  saveGame(user!, newInv);
              }
              setBattleCommand(null);
          };
          turn();
      }
  }, [battleCommand, gameState, isBattleOver]);

  // --- VIEWS ---

  if (gameState === 'SPLASH') {
      return (
          <div className="w-full h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
              <div className="scan-line"></div>
              <div className="z-10 text-center">
                  <h1 className="text-6xl font-black text-cyan-400 glitch-text mb-2" data-text="PIXUPET">PIXUPET</h1>
                  <div className="text-xs text-gray-500 tracking-[0.5em] mb-8">NEURAL LINK V4.0</div>
                  {user ? (
                      <CyberButton label="RESUME LINK" onClick={() => setGameState('NEXUS')} variant="primary" className="w-64 py-4 text-xl" />
                  ) : (
                      <CyberButton label="INITIATE SYSTEM" onClick={handleCreateProfile} variant="primary" className="w-64 py-4 text-xl" />
                  )}
              </div>
          </div>
      );
  }

  if (gameState === 'SCAN') {
      return (
          <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-cyan-400">
              <div className="w-32 h-32 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin mb-8 shadow-[0_0_30px_#06b6d4]"></div>
              <div className="text-xl font-mono animate-pulse">{scanMessage}</div>
          </div>
      );
  }

  if (gameState === 'ARENA') {
      return (
          <div className={`w-full h-screen bg-gray-900 flex flex-col relative ${screenShake ? 'shake' : ''}`}>
              {/* BATTLE HUD */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-20 text-white font-mono">
                  <div className="w-1/2 pr-4">
                      <div className="text-xs text-cyan-400 font-bold mb-1">{playerPet?.name} (LV.{playerPet?.level})</div>
                      <div className="w-full h-4 bg-gray-800 border border-gray-600 skew-x-[-12deg]">
                          <div className="h-full bg-cyan-500 transition-all duration-300" style={{width: `${(playerPet?.currentHp!/playerPet?.maxHp!)*100}%`}}></div>
                      </div>
                  </div>
                  <div className="w-1/2 pl-4 text-right">
                      <div className="text-xs text-red-400 font-bold mb-1">{enemyPet?.name}</div>
                      <div className="w-full h-4 bg-gray-800 border border-gray-600 skew-x-[-12deg]">
                          <div className="h-full bg-red-500 transition-all duration-300" style={{width: `${(enemyPet?.currentHp!/enemyPet?.maxHp!)*100}%`}}></div>
                      </div>
                  </div>
              </div>

              {/* SCENE */}
              <div className="flex-1 flex relative bg-[radial-gradient(circle_at_center,#1a202c_0%,#000_100%)]">
                   <div className="w-1/2 h-full relative border-r border-gray-800">
                       {playerPet && <VoxelViewer code={playerPet.voxelCode} mode="BATTLE" />}
                   </div>
                   <div className="w-1/2 h-full relative">
                       {enemyPet && <VoxelViewer code={enemyPet.voxelCode} mode="BATTLE" />}
                   </div>
              </div>

              {/* CONTROLS */}
              <div className="h-48 bg-black border-t-2 border-cyan-500 p-4 flex gap-4 z-20">
                  <div className="w-1/3 bg-gray-900 border border-gray-700 p-2 overflow-y-auto text-[10px] text-green-400 font-mono">
                      {battleLog.map((l, i) => <div key={i}>> {l}</div>)}
                  </div>
                  <div className="w-2/3 grid grid-cols-2 gap-2">
                      {!isBattleOver ? (
                          <>
                              <CyberButton label="ATTACK" onClick={() => setBattleCommand('ATTACK')} disabled={!!battleCommand} className="h-full" />
                              <CyberButton label="DEFEND" onClick={() => setBattleCommand('DEFEND')} disabled={!!battleCommand} />
                              <CyberButton label="OVERCLOCK" variant="danger" onClick={() => setBattleCommand('OVERCLOCK')} disabled={!!battleCommand} />
                              <CyberButton label="FLEE" variant="warning" onClick={() => setGameState('NEXUS')} disabled={!!battleCommand} />
                          </>
                      ) : (
                          <CyberButton label="RETURN TO NEXUS" onClick={() => setGameState('NEXUS')} variant="primary" className="col-span-2 h-full" />
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // NEXUS / MAIN HUB
  const activePet = inventory[0];

  return (
      <div className={`w-full h-screen relative flex flex-col bg-black text-white overflow-hidden ${screenShake ? 'shake' : ''}`}>
          {/* 1. TOP STATUS BAR */}
          <div className="absolute top-0 w-full p-2 flex justify-between items-center z-30 bg-gradient-to-b from-black to-transparent pointer-events-none">
              <div className="pointer-events-auto flex gap-2">
                  <div className="bg-gray-900 border border-gray-700 px-3 py-1 text-xs rounded-sm">
                      <span className="text-yellow-400 font-bold">RK.</span> {user?.currentRank}
                  </div>
                  <div className="bg-gray-900 border border-gray-700 px-3 py-1 text-xs rounded-sm">
                      <span className="text-yellow-400 font-bold">$</span> {user?.coins}
                  </div>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">SYS.ONLINE</div>
          </div>

          {/* 2. MAIN VIEWPORT (VOXEL) */}
          {activePet ? (
              <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
                  <VoxelViewer code={activePet.voxelCode} mode="HABITAT" paused={gameState !== 'NEXUS'} />
                  
                  {/* Floating Text Layer */}
                  <div className="absolute inset-0 pointer-events-none">
                      {floatingTexts.map(ft => (
                          <div key={ft.id} className={`absolute font-black text-xl ${ft.color} float-up`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>{ft.text}</div>
                      ))}
                  </div>

                  {/* 3. HUD LEFT: PET STATUS */}
                  <div className="absolute top-16 left-4 w-48 z-20 pointer-events-none">
                      <div className="cyber-panel p-3 cyber-shape mb-4 pointer-events-auto">
                          <h2 className="text-lg font-black text-cyan-400 leading-none mb-1">{activePet.name}</h2>
                          <div className="text-[10px] text-gray-400 mb-2 uppercase">{activePet.stage} CLASS - LV.{activePet.level}</div>
                          
                          <div className="space-y-2">
                              <div>
                                  <div className="flex justify-between text-[10px] mb-0.5"><span>INTEGRITY</span><span>{activePet.currentHp}/{activePet.maxHp}</span></div>
                                  <div className="h-1.5 bg-gray-800 w-full"><div className="h-full bg-green-500" style={{width: `${(activePet.currentHp!/activePet.maxHp!)*100}%`}}></div></div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-[10px] mb-0.5"><span>ENERGY</span><span>{activePet.hunger}%</span></div>
                                  <div className="h-1.5 bg-gray-800 w-full"><div className="h-full bg-yellow-500" style={{width: `${activePet.hunger}%`}}></div></div>
                              </div>
                          </div>
                      </div>
                      <ProtocolMonitor pet={activePet} />
                  </div>

                  {/* 4. HUD RIGHT: ACTION MENU */}
                  <div className="absolute top-16 right-4 w-12 flex flex-col gap-2 z-20">
                       <button onClick={() => setGameState('DATABASE')} className="w-12 h-12 bg-black border border-gray-600 flex items-center justify-center hover:bg-gray-800 hover:border-cyan-400 transition-all">
                          <NeonIcon path={ICONS.DATABASE} size={20} />
                       </button>
                       <button onClick={() => setGameState('SHOP')} className="w-12 h-12 bg-black border border-gray-600 flex items-center justify-center hover:bg-gray-800 hover:border-yellow-400 transition-all">
                          <NeonIcon path={ICONS.SHOP} size={20} />
                       </button>
                  </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center z-10 p-8 text-center">
                  <h2 className="text-2xl font-bold mb-4 text-cyan-400">NO SIGNAL DETECTED</h2>
                  <div className="w-64 text-sm text-gray-400 mb-8">Scan a physical object to materialize a Spark-Class lifeform.</div>
                  <CyberButton label="INITIATE SCAN" onClick={() => fileInputRef.current?.click()} variant="primary" className="py-4 px-8 text-lg" />
              </div>
          )}

          {/* 5. BOTTOM DOCK */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-black border-t border-gray-800 z-30 flex items-center justify-center gap-4 px-4">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                   if(e.target.files?.[0]) {
                       const r = new FileReader();
                       r.onload = (ev) => { if(typeof ev.target?.result === 'string') handleScan(ev.target.result); };
                       r.readAsDataURL(e.target.files[0]);
                       e.target.value = '';
                   }
              }} />
              
              {activePet && (
                <>
                  <CyberButton label="BATTLE" icon={ICONS.SWORD} onClick={() => startBattle('WILD')} variant="danger" className="h-12 flex-1 max-w-[140px]" />
                  
                  <div className="relative group">
                      <CyberButton label="SCAN" icon={ICONS.SCAN} onClick={() => fileInputRef.current?.click()} variant="primary" className="h-16 w-16 rounded-full !clip-none border-2 border-cyan-500 shadow-[0_0_20px_#06b6d4]" />
                  </div>
                  
                  <div className="relative group">
                      <CyberButton label="EVOLVE" icon={ICONS.NEXUS} disabled={activePet.level < EVO_THRESHOLDS.SURGE} onClick={handleEvolve} variant="warning" className="h-12 flex-1 max-w-[140px]" />
                  </div>
                </>
              )}
          </div>

          {/* OVERLAYS: INVENTORY / SHOP / DATABASE */}
          {gameState === 'DATABASE' && (
              <div className="absolute inset-0 bg-black/95 z-40 p-4 flex flex-col animate-pop-in">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                      <h2 className="text-xl font-black text-cyan-400">NEURAL DATABASE</h2>
                      <CyberButton label="CLOSE" onClick={() => setGameState('NEXUS')} />
                  </div>
                  
                  {/* TABS */}
                  <div className="flex gap-4 mb-4 text-sm">
                      <div className="text-white border-b-2 border-white pb-1">PETS</div>
                      <div className="text-gray-500">LOGS</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-20">
                      {inventory.map(p => (
                          <div key={p.id} onClick={() => { 
                              const newInv = [p, ...inventory.filter(x => x.id !== p.id)];
                              setInventory(newInv);
                              saveGame(user!, newInv);
                              setGameState('NEXUS');
                          }} className={`bg-gray-900 border ${p.id === activePet?.id ? 'border-cyan-400' : 'border-gray-700'} p-2 rounded cursor-pointer hover:bg-gray-800`}>
                              <img src={p.cardArtUrl || p.imageSource} className="w-full aspect-square object-cover mb-2 rounded bg-black" />
                              <div className="font-bold text-sm">{p.name}</div>
                              <div className="text-[10px] text-gray-500">{p.stage} Lv.{p.level}</div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {gameState === 'SHOP' && (
               <div className="absolute inset-0 bg-black/95 z-40 p-4 flex flex-col animate-pop-in">
                   <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                      <h2 className="text-xl font-black text-yellow-400">BLACK MARKET</h2>
                      <CyberButton label="CLOSE" onClick={() => setGameState('NEXUS')} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 overflow-y-auto pb-20">
                      <div className="text-xs text-gray-500 uppercase mb-2">Inventory</div>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                          {user?.inventory.map((itemId, idx) => (
                              <div key={idx} onClick={() => handleFeed(itemId)} className="bg-gray-800 p-2 text-center border border-gray-600 cursor-pointer hover:border-white">
                                  <div className="text-xl">{ITEMS_DB[itemId].icon}</div>
                              </div>
                          ))}
                      </div>

                      <div className="text-xs text-gray-500 uppercase mb-2">Buy</div>
                      {Object.values(ITEMS_DB).map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3">
                              <div className="flex items-center gap-3">
                                  <div className="text-2xl">{item.icon}</div>
                                  <div>
                                      <div className="font-bold text-sm">{item.name}</div>
                                      <div className="text-[10px] text-gray-500">{item.description}</div>
                                  </div>
                              </div>
                              <CyberButton 
                                disabled={(user?.coins || 0) < item.price} 
                                onClick={() => {
                                    const newUser = { ...user!, coins: (user?.coins||0) - item.price, inventory: [...(user?.inventory||[]), item.id] };
                                    saveGame(newUser, inventory);
                                }} 
                                label={`${item.price}`} 
                                className="text-xs h-8"
                              />
                          </div>
                      ))}
                  </div>
               </div>
          )}

          {offlineReport && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
                  <div className="w-full max-w-md bg-gray-900 border border-cyan-500 p-6 m-4 text-center cyber-shape">
                      <h2 className="text-2xl font-black text-cyan-400 mb-4">SYSTEM RESUMED</h2>
                      <div className="text-sm text-gray-300 mb-4">
                          While you were away:<br/>
                          <span className="text-green-400">+{offlineReport.xpGained} XP</span> | <span className="text-yellow-400">+{offlineReport.coinsFound} Coins</span>
                      </div>
                      <CyberButton label="ACKNOWLEDGE" onClick={() => setOfflineReport(null)} variant="primary" className="w-full" />
                  </div>
              </div>
          )}
      </div>
  );
};

export default App;
