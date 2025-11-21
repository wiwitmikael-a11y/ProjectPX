
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { generateVoxelScene, analyzeObject, MonsterStats, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, AITactic, calculateOfflineProgress, OfflineReport, EVO_THRESHOLDS, MonsterStage, determineEvolutionPath, STARTER_PACKS, getProceduralMonsterArt } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'ONBOARDING' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'DATABASE' | 'ARENA' | 'SYNTHESIS' | 'TRAINING' | 'SHOP' | 'EVOLUTION';
type EventType = 'WILD_BATTLE' | 'TREASURE' | 'MERCHANT';
type BattleCommand = 'ATTACK' | 'DEFEND' | 'CHARGE' | 'OVERCLOCK';

const SAVE_VERSION = 'v4.2_NEOPOP'; 

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
  imageSource?: string; // Optional now, as we rely on art
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

const AnimatedLogo = () => {
    const text = "PIXUPET";
    return (
        <div className="voxel-logo-container mb-4 text-6xl md:text-7xl">
            {text.split('').map((char, i) => (
                <span 
                    key={i} 
                    className="logo-char" 
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    {char}
                </span>
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

const ProtocolMonitor = ({ pet, minimal }: { pet: Pixupet, minimal?: boolean }) => {
    const { protocolName, color, borderColor, icon, dominant, desc } = determineEvolutionPath({ 
        atk: pet.atk, 
        def: pet.def, 
        spd: pet.spd, 
        happiness: pet.happiness || 50 
    });

    if (minimal) {
         return <div className={`text-xs font-bold ${color} border ${borderColor} bg-white rounded px-1`}>{icon} {protocolName}</div>
    }

    return (
        <div className={`pop-card p-3 w-full mb-2 bg-white`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-500 font-black uppercase">CURRENT BUILD</span>
                <span className={`text-xs font-black ${color.replace('text-', 'text-')}`}>{icon} {protocolName}</span>
            </div>
            <div className="text-[10px] text-gray-600 mb-2 italic">{desc}</div>
            
            {/* Stat Bars */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-8 text-red-500">DPS</span>
                    <div className="flex-1 pop-bar-container h-2"><div className="pop-bar-fill bg-red-400" style={{width: `${Math.min(100, pet.atk)}%`}}></div></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-8 text-blue-500">TANK</span>
                    <div className="flex-1 pop-bar-container h-2"><div className="pop-bar-fill bg-blue-400" style={{width: `${Math.min(100, pet.def)}%`}}></div></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-8 text-yellow-600">AGI</span>
                    <div className="flex-1 pop-bar-container h-2"><div className="pop-bar-fill bg-yellow-400" style={{width: `${Math.min(100, pet.spd)}%`}}></div></div>
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

  const spawnFloatText = (text: string, color: string = "text-black") => {
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
          // We generate the scene WITHOUT the image to avoid copyright, relying on text description
          let code = await generateVoxelScene("", stats.visual_design, stats.bodyType);
          code = makeBackgroundTransparent(zoomCamera(hideBodyText(code), 0.9));
          
          const art = getProceduralMonsterArt(stats.name, stats.element);

          const newPet: Pixupet = {
              ...stats, 
              voxelCode: code, 
              // Do NOT store the original imageSource to avoid display issues or copyright. 
              // Use the generated art.
              imageSource: art, 
              cardArtUrl: art,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0, tactic: 'BALANCED', happiness: 50
          };
          
          const newInv = [newPet, ...inventory];
          saveGame(user!, newInv);
          setTimeout(() => setGameState('NEXUS'), 2000);
      } catch (e) {
          alert("Scan Error. Signal lost.");
          setGameState('NEXUS');
      }
  };

  const handleCreateProfile = () => {
      // Step 1: Initialize User Profile. Inventory is empty.
      // We move to ONBOARDING to choose how to get the first pet.
      const u: UserProfile = { name: 'Gamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), lastSaveAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: ['data_burger', 'potion_small'] };
      setUser(u);
      setGameState('ONBOARDING');
  };

  const handleSelectStarter = (starterId: string) => {
      const pack = STARTER_PACKS.find(s => s.id === starterId);
      if (!pack) return;

      // Create generic starter data
      const art = getProceduralMonsterArt(pack.name, pack.element);
      const voxel = getGenericVoxel(pack.element); // Instant load

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

      const newInv = [starterPet];
      saveGame(user!, newInv);
      setGameState('NEXUS');
  }

  const handleFeed = (itemId: string) => {
      const item = ITEMS_DB[itemId];
      const pet = inventory[0];
      if (!item) return;
      
      let newPet = { ...pet };
      if (item.type === 'Mod') {
          spawnFloatText("HARDWARE UPGRADE", "text-purple-600");
      } else {
          if (pet.hunger >= 100 && item.type === 'Food') { spawnFloatText("FULL BUFF", "text-red-500"); return; }
      }

      if (item.effect) newPet = item.effect(newPet);
      
      const invList = [...user!.inventory];
      const idx = invList.indexOf(itemId);
      if (idx > -1) invList.splice(idx, 1);
      
      const newUser = { ...user!, inventory: invList };
      const newInv = [newPet, ...inventory.slice(1)];
      saveGame(newUser, newInv);
      spawnFloatText(`${item.name} Used`, "text-green-600");
  };

  const handleEvolve = async () => {
      const pet = inventory[0];
      if (!pet) return;
      const confirmed = window.confirm(`Ready for a Level Up? ${pet.name} is evolving!`);
      if (!confirmed) return;

      setGameState('SCAN');
      setScanMessage("COMPILING NEW MODEL...");
      
      try {
          const result = await evolveVoxelScene(pet);
          const newArt = getProceduralMonsterArt(result.nextName, pet.element);
          
          const evolvedPet: Pixupet = {
              ...pet,
              visual_design: result.visual_design,
              voxelCode: makeBackgroundTransparent(result.code),
              cardArtUrl: newArt,
              imageSource: newArt,
              name: result.nextName,
              stage: result.nextStage,
              atk: pet.atk + 15, def: pet.def + 15, spd: pet.spd + 15,
              maxHp: (pet.maxHp||100) + 50, currentHp: (pet.maxHp||100) + 50,
          };
          
          const newInv = [evolvedPet, ...inventory.slice(1)];
          saveGame(user!, newInv);
          setGameState('NEXUS');
          alert(`UPGRADE SUCCESS: ${result.nextName} (${result.nextStage})`);
      } catch (e) {
          setGameState('NEXUS');
          alert("Compilation Failed. Try again.");
      }
  };

  // --- BATTLE LOGIC ---
  const startBattle = (type: 'WILD' | 'ARENA', target?: Pixupet) => {
      const p = inventory[0];
      if (!p || (p.currentHp || 0) <= 0) { alert("Pet fainted! Use meds."); return; }
      
      // Hunger Cost
      if (p.hunger < 10) { alert("No energy! Eat snacks."); return; }
      const newPet = { ...p, hunger: p.hunger - 5 };
      setInventory([newPet, ...inventory.slice(1)]);
      setPlayerPet(newPet);

      // Enemy Setup
      const enemy = target || getRandomEnemy(user?.currentRank || 'E', p.level);
      const enemyVoxel = getGenericVoxel(enemy.element);
      setEnemyPet({ ...enemy, voxelCode: makeBackgroundTransparent(enemyVoxel), currentHp: enemy.hp });

      setBattleLog(["MATCH STARTED!", `A Wild ${enemy.name} joined!`]);
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
                      log = ">> ULTI ACTIVATED! ";
                  } else {
                      log = ">> Not enough energy for Ulti. ";
                  }
              }

              if (battleCommand === 'ATTACK' || battleCommand === 'OVERCLOCK') {
                  pDmg = Math.max(5, Math.floor((playerPet.atk * 0.5) - (enemyPet.def * 0.2)));
                  if (Math.random() < 0.1) { pDmg *= 2; log += "CRIT! "; }
                  pDmg = Math.floor(pDmg * ocMult);
                  log += `${playerPet.name} hit for ${pDmg} DMG!`;
                  
                  const newHp = Math.max(0, (enemyPet.currentHp||0) - pDmg);
                  setEnemyPet(curr => curr ? ({...curr, currentHp: newHp}) : null);
                  triggerShake();
                  
                  if (newHp <= 0) {
                      setBattleLog(prev => ["ENEMY DOWN!", log, ...prev]);
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
                          setBattleLog(prev => [`DROPPED: ${ITEMS_DB[loot].name}`, ...prev]);
                      }
                      
                      saveGame(newUser, newInv);
                      return;
                  }
              } else if (battleCommand === 'DEFEND') {
                  isDefending = true;
                  log = "Shield Up!";
              }
              setBattleLog(prev => [log, ...prev]);

              // DELAY ENEMY TURN
              await new Promise(r => setTimeout(r, 1000));
              
              // ENEMY TURN
              let eDmg = Math.max(2, Math.floor((enemyPet.atk * 0.5) - (playerPet.def * 0.2)));
              if (isDefending) eDmg = Math.floor(eDmg * 0.5);
              
              const pNewHp = Math.max(0, (playerPet.currentHp||0) - eDmg);
              setPlayerPet(curr => curr ? ({...curr, currentHp: pNewHp}) : null);
              setBattleLog(prev => [`Enemy hit you for ${eDmg}`, ...prev]);

              if (pNewHp <= 0) {
                  setIsBattleOver(true);
                  setBattleLog(prev => ["YOU DIED.", ...prev]);
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
          <div className="w-full h-screen flex flex-col items-center justify-center bg-yellow-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_0%,transparent_20%)] bg-[length:40px_40px] opacity-50"></div>
              <div className="z-10 text-center flex flex-col items-center">
                  <AnimatedLogo />
                  <div className="text-xl font-bold text-black mb-8 bg-white px-4 py-1 border-2 border-black rounded-full inline-block shadow-[4px_4px_0_#000]">SYSTEM INITIALIZED // PRESS START</div>
                  {user && inventory.length > 0 ? (
                      <PopButton label="CONTINUE" onClick={() => setGameState('NEXUS')} variant="primary" className="w-64 py-4 text-xl wiggle" />
                  ) : (
                      <PopButton label="NEW GAME" onClick={handleCreateProfile} variant="primary" className="w-64 py-4 text-xl wiggle" />
                  )}
              </div>
          </div>
      );
  }

  if (gameState === 'ONBOARDING') {
      return (
        <div className="w-full h-screen bg-indigo-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.5)_0%,transparent_20%)] bg-[length:40px_40px] opacity-30"></div>
             <div className="z-10 flex flex-col items-center max-w-md w-full">
                <h1 className="text-2xl md:text-3xl font-black mb-8 bg-white px-6 py-3 border-4 border-black shadow-[6px_6px_0_#000] rotate-1 text-center">SELECT SPAWN METHOD</h1>
                
                <div className="grid grid-cols-1 gap-6 w-full">
                    <PopButton 
                        label="REALITY HACK" 
                        subLabel="Scan object IRL to generate unique data."
                        icon={ICONS.SCAN}
                        variant="action"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 text-xl shadow-[6px_6px_0_#000] hover:scale-105 transition-transform"
                    />
                    
                    <div className="text-center font-bold opacity-50">- OR -</div>

                    <PopButton 
                        label="LOAD PRESET" 
                        subLabel="Adopt a verified Starter Pack."
                        icon={ICONS.DATABASE}
                        variant="primary"
                        onClick={() => setGameState('STARTER_SELECT')}
                        className="w-full py-6 text-xl shadow-[6px_6px_0_#000] hover:scale-105 transition-transform"
                    />
                </div>
             </div>
             
             {/* Hidden Input for the "Reality Hack" button to trigger */}
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
          <div className="w-full h-screen bg-blue-200 flex flex-col items-center justify-center p-4">
              <h1 className="text-3xl font-black mb-6 bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_#000] rotate-1">CHOOSE YOUR MAIN</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
                  {STARTER_PACKS.map(starter => (
                      <div key={starter.id} className="pop-card p-4 flex flex-col items-center bg-white cursor-pointer hover:scale-105 transition-transform" onClick={() => handleSelectStarter(starter.id)}>
                          <div className={`w-24 h-24 rounded-full border-4 border-black mb-4 flex items-center justify-center text-4xl ${ELEMENT_THEMES[starter.element].bg}`}>
                              {ELEMENT_THEMES[starter.element].icon}
                          </div>
                          <h2 className="text-xl font-black uppercase mb-2">{starter.name}</h2>
                          <div className="text-xs font-bold bg-black text-white px-2 py-1 rounded mb-2">{starter.element} TYPE</div>
                          <p className="text-sm text-center text-gray-600 font-bold mb-4">{starter.description}</p>
                          
                          {/* Stats Preview */}
                          <div className="w-full space-y-1">
                             <div className="flex items-center text-xs font-bold"><span className="w-8">HP</span><div className="h-2 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-green-400" style={{width: `${starter.stats.hp/2}%`}}></div></div></div>
                             <div className="flex items-center text-xs font-bold"><span className="w-8">ATK</span><div className="h-2 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-red-400" style={{width: `${starter.stats.atk*5}%`}}></div></div></div>
                             <div className="flex items-center text-xs font-bold"><span className="w-8">DEF</span><div className="h-2 bg-gray-200 flex-1 rounded border border-black overflow-hidden"><div className="h-full bg-blue-400" style={{width: `${starter.stats.def*5}%`}}></div></div></div>
                          </div>

                          <PopButton label="SELECT" onClick={() => handleSelectStarter(starter.id)} className="mt-4 w-full" />
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
              <div className="text-xl font-black bg-white px-4 py-2 border-2 border-black shadow-[4px_4px_0_#000]">{scanMessage}</div>
          </div>
      );
  }

  if (gameState === 'ARENA') {
      return (
          <div className={`w-full h-screen bg-purple-200 flex flex-col relative ${screenShake ? 'shake' : ''}`}>
              {/* BATTLE HUD */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-20 pointer-events-none">
                  <div className="pop-card px-4 py-2 bg-white">
                      <div className="text-sm font-black">{playerPet?.name} (Lv.{playerPet?.level})</div>
                      <div className="w-32 pop-bar-container h-3 mt-1">
                          <div className="pop-bar-fill bg-green-400" style={{width: `${(playerPet?.currentHp!/playerPet?.maxHp!)*100}%`}}></div>
                      </div>
                  </div>
                  <div className="pop-card px-4 py-2 bg-white">
                      <div className="text-sm font-black text-right">{enemyPet?.name}</div>
                      <div className="w-32 pop-bar-container h-3 mt-1">
                          <div className="pop-bar-fill bg-red-400" style={{width: `${(enemyPet?.currentHp!/enemyPet?.maxHp!)*100}%`}}></div>
                      </div>
                  </div>
              </div>

              {/* SCENE */}
              <div className="flex-1 flex relative">
                   <div className="w-1/2 h-full relative flex items-end justify-center pb-20">
                       {playerPet && <div className="w-64 h-64 relative"><VoxelViewer code={playerPet.voxelCode} mode="BATTLE" /></div>}
                   </div>
                   <div className="w-1/2 h-full relative flex items-center justify-center pt-20">
                       {enemyPet && <div className="w-64 h-64 relative"><VoxelViewer code={enemyPet.voxelCode} mode="BATTLE" /></div>}
                   </div>
              </div>

              {/* CONTROLS */}
              <div className="h-56 bg-white border-t-4 border-black p-4 flex gap-4 z-20">
                  <div className="w-1/3 bg-gray-100 border-2 border-black p-2 overflow-y-auto text-sm font-bold rounded">
                      {battleLog.map((l, i) => <div key={i} className="mb-1 border-b border-gray-300 pb-1">{l}</div>)}
                  </div>
                  <div className="w-2/3 grid grid-cols-2 gap-2">
                      {!isBattleOver ? (
                          <>
                              <PopButton label="SMASH" variant="danger" onClick={() => setBattleCommand('ATTACK')} disabled={!!battleCommand} className="h-full text-lg" />
                              <PopButton label="BLOCK" variant="primary" onClick={() => setBattleCommand('DEFEND')} disabled={!!battleCommand} />
                              <PopButton label="ULTI" variant="warning" onClick={() => setBattleCommand('OVERCLOCK')} disabled={!!battleCommand} />
                              <PopButton label="RUN" onClick={() => setGameState('NEXUS')} disabled={!!battleCommand} />
                          </>
                      ) : (
                          <PopButton label="BACK TO LOBBY" onClick={() => setGameState('NEXUS')} variant="primary" className="col-span-2 h-full text-xl" />
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // NEXUS / MAIN HUB
  const activePet = inventory[0];

  return (
      <div className={`w-full h-screen relative flex flex-col bg-yellow-50 text-black overflow-hidden ${screenShake ? 'shake' : ''}`}>
          {/* 1. TOP STATUS BAR */}
          <div className="absolute top-0 w-full p-4 flex justify-between items-center z-30 pointer-events-none">
              <div className="pointer-events-auto flex gap-2">
                  <div className="pop-card px-3 py-1 text-sm font-bold bg-white">
                      RANK {user?.currentRank}
                  </div>
                  <div className="pop-card px-3 py-1 text-sm font-bold bg-yellow-300">
                      💰 {user?.coins}
                  </div>
              </div>
          </div>

          {/* 2. MAIN VIEWPORT (VOXEL) */}
          {activePet ? (
              <div className="absolute inset-0 z-0">
                  {/* A nice circular stage background */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white border-4 border-black rounded-full opacity-50"></div>
                  
                  <VoxelViewer code={activePet.voxelCode} mode="HABITAT" paused={gameState !== 'NEXUS'} />
                  
                  {/* Floating Text Layer */}
                  <div className="absolute inset-0 pointer-events-none">
                      {floatingTexts.map(ft => (
                          <div key={ft.id} className={`absolute font-black text-xl ${ft.color} float-up drop-shadow-md`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>{ft.text}</div>
                      ))}
                  </div>

                  {/* 3. HUD LEFT: PET STATUS */}
                  <div className="absolute top-20 left-4 w-52 z-20 pointer-events-none">
                      <div className="pop-card p-3 mb-3 pointer-events-auto bg-white">
                          <h2 className="text-xl font-black leading-none mb-1">{activePet.name}</h2>
                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase">{activePet.stage} • Lv.{activePet.level}</div>
                          
                          <div className="space-y-2">
                              <div>
                                  <div className="flex justify-between text-[10px] font-bold mb-0.5"><span>HP</span><span>{activePet.currentHp}/{activePet.maxHp}</span></div>
                                  <div className="pop-bar-container h-2"><div className="pop-bar-fill bg-green-400" style={{width: `${(activePet.currentHp!/activePet.maxHp!)*100}%`}}></div></div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-[10px] font-bold mb-0.5"><span>ENERGY</span><span>{activePet.hunger}%</span></div>
                                  <div className="pop-bar-container h-2"><div className="pop-bar-fill bg-orange-400" style={{width: `${activePet.hunger}%`}}></div></div>
                              </div>
                          </div>
                      </div>
                      <div className="pointer-events-auto">
                        <ProtocolMonitor pet={activePet} />
                      </div>
                  </div>

                  {/* 4. HUD RIGHT: ACTION MENU */}
                  <div className="absolute top-20 right-4 flex flex-col gap-3 z-20">
                       <button onClick={() => setGameState('DATABASE')} className="w-14 h-14 bg-white border-3 border-black rounded-xl shadow-[4px_4px_0_#000] flex items-center justify-center hover:translate-y-1 hover:shadow-[2px_2px_0_#000] transition-all active:translate-y-2 active:shadow-none">
                          <NeonIcon path={ICONS.DATABASE} size={24} />
                       </button>
                       <button onClick={() => setGameState('SHOP')} className="w-14 h-14 bg-yellow-300 border-3 border-black rounded-xl shadow-[4px_4px_0_#000] flex items-center justify-center hover:translate-y-1 hover:shadow-[2px_2px_0_#000] transition-all active:translate-y-2 active:shadow-none">
                          <NeonIcon path={ICONS.SHOP} size={24} />
                       </button>
                  </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center z-10 p-8 text-center">
                  <h2 className="text-3xl font-black mb-4 transform rotate-[-2deg]">NO AVATAR FOUND!</h2>
                  <div className="w-64 text-sm font-bold mb-8 bg-white p-4 border-2 border-black rounded-lg shadow-md">Scan something IRL to generate your first character.</div>
                  <PopButton label="SCAN OBJECT" onClick={() => fileInputRef.current?.click()} variant="primary" className="py-4 px-8 text-lg wiggle" />
              </div>
          )}

          {/* 5. BOTTOM DOCK */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center gap-4 px-4 pointer-events-none">
              <div className="pointer-events-auto flex gap-4 items-end">
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
                      <PopButton label="PVP" icon={ICONS.SWORD} onClick={() => startBattle('WILD')} variant="danger" className="h-14 text-lg" />
                      
                      <div className="relative group -mt-4">
                          <PopButton label="" icon={ICONS.SCAN} onClick={() => fileInputRef.current?.click()} variant="primary" className="h-20 w-20 rounded-full !p-0 flex items-center justify-center border-4" />
                      </div>
                      
                      <PopButton label="LEVEL UP" icon={ICONS.NEXUS} disabled={activePet.level < EVO_THRESHOLDS.PRO} onClick={handleEvolve} variant="action" className="h-14 text-lg" />
                    </>
                  )}
              </div>
          </div>

          {/* OVERLAYS: INVENTORY / SHOP / DATABASE */}
          {gameState === 'DATABASE' && (
              <div className="absolute inset-0 bg-black/50 z-40 p-4 flex flex-col animate-pop-in backdrop-blur-sm">
                  <div className="bg-white border-4 border-black rounded-2xl flex-1 flex flex-col overflow-hidden shadow-[8px_8px_0_#000]">
                      <div className="flex justify-between items-center p-4 border-b-4 border-black bg-purple-200">
                          <h2 className="text-2xl font-black">ROSTER</h2>
                          <PopButton label="X" onClick={() => setGameState('NEXUS')} className="!p-2 !h-8 !w-8" />
                      </div>
                      
                      <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto pb-20 bg-gray-50 flex-1">
                          {inventory.map(p => (
                              <div key={p.id} onClick={() => { 
                                  const newInv = [p, ...inventory.filter(x => x.id !== p.id)];
                                  setInventory(newInv);
                                  saveGame(user!, newInv);
                                  setGameState('NEXUS');
                              }} className={`pop-card p-2 cursor-pointer bg-white ${p.id === activePet?.id ? 'ring-4 ring-blue-400' : ''}`}>
                                  <img src={p.cardArtUrl} className="w-full aspect-square object-cover mb-2 rounded border-2 border-black bg-gray-200" />
                                  <div className="font-black text-sm truncate">{p.name}</div>
                                  <div className="text-xs font-bold text-gray-500">{p.stage} • Lv.{p.level}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {gameState === 'SHOP' && (
               <div className="absolute inset-0 bg-black/50 z-40 p-4 flex flex-col animate-pop-in backdrop-blur-sm">
                   <div className="bg-white border-4 border-black rounded-2xl flex-1 flex flex-col overflow-hidden shadow-[8px_8px_0_#000]">
                       <div className="flex justify-between items-center p-4 border-b-4 border-black bg-yellow-300">
                          <h2 className="text-2xl font-black">ITEM SHOP</h2>
                          <PopButton label="X" onClick={() => setGameState('NEXUS')} className="!p-2 !h-8 !w-8" />
                      </div>
                      <div className="p-4 overflow-y-auto pb-20 bg-white flex-1">
                          <div className="text-sm font-black uppercase mb-2 bg-black text-white inline-block px-2">Your Inventory</div>
                          <div className="grid grid-cols-4 gap-2 mb-6">
                              {user?.inventory.map((itemId, idx) => (
                                  <div key={idx} onClick={() => handleFeed(itemId)} className="bg-gray-100 p-2 text-center border-2 border-black rounded-lg cursor-pointer hover:bg-gray-200 active:scale-95 transition-transform">
                                      <div className="text-2xl">{ITEMS_DB[itemId].icon}</div>
                                  </div>
                              ))}
                          </div>

                          <div className="text-sm font-black uppercase mb-2 bg-black text-white inline-block px-2">Buy Items</div>
                          <div className="space-y-2">
                              {Object.values(ITEMS_DB).map(item => (
                                  <div key={item.id} className="flex items-center justify-between bg-white border-2 border-black p-3 rounded-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                          <div className="text-3xl bg-gray-100 p-2 rounded-full border border-black">{item.icon}</div>
                                          <div>
                                              <div className="font-black text-sm">{item.name}</div>
                                              <div className="text-xs text-gray-500 font-medium">{item.description}</div>
                                          </div>
                                      </div>
                                      <PopButton 
                                        disabled={(user?.coins || 0) < item.price} 
                                        onClick={() => {
                                            const newUser = { ...user!, coins: (user?.coins||0) - item.price, inventory: [...(user?.inventory||[]), item.id] };
                                            saveGame(newUser, inventory);
                                        }} 
                                        label={`${item.price}`} 
                                        className="text-xs !py-1 !px-3 h-8"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                   </div>
               </div>
          )}

          {offlineReport && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="w-full max-w-md bg-white border-4 border-black p-6 m-4 text-center rounded-2xl shadow-[10px_10px_0_#000] animate-pop-in">
                      <h2 className="text-3xl font-black text-black mb-2">WELCOME BACK</h2>
                      <div className="text-sm font-bold text-gray-600 mb-6 bg-gray-100 p-4 rounded border-2 border-gray-300">
                          AFK Report:<br/>
                          <span className="text-green-600 text-lg">+{offlineReport.xpGained} XP</span> | <span className="text-yellow-600 text-lg">+{offlineReport.coinsFound} Coins</span>
                      </div>
                      <PopButton label="NICE" onClick={() => setOfflineReport(null)} variant="primary" className="w-full" />
                  </div>
              </div>
          )}
      </div>
  );
};

export default App;
