
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { generateVoxelScene, analyzeObject, MonsterStats, fuseVoxelScene, generateCardArt, getGenericVoxel, evolveVoxelScene } from './services/gemini';
import { hideBodyText, zoomCamera, makeBackgroundTransparent } from './utils/html';
import { ITEMS_DB, ENEMIES_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_CHART } from './services/gameData';

// --- TYPES ---
type GameState = 'SPLASH' | 'NEXUS' | 'SCAN' | 'INVENTORY' | 'ARENA' | 'SYNTHESIS' | 'ERROR';

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
    STAR: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
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

const VoxelViewer = memo(({ code, onRef, className, mode = 'HABITAT' }: { code: string, onRef?: any, className?: string, mode?: 'HABITAT'|'BATTLE' }) => {
    const localRef = useRef<HTMLIFrameElement>(null);
    
    useEffect(() => {
        if (onRef) {
             if (typeof onRef === 'function') onRef(localRef.current);
             else onRef.current = localRef.current;
        }
    }, [onRef]);

    return (
        <iframe 
            ref={localRef}
            srcDoc={code} 
            className={`border-0 pointer-events-auto ${className || "w-full h-full"}`} 
            title="Pixupet View"
            style={{ background: 'transparent' }}
            scrolling="no" 
            onLoad={(e) => {
                const iframe = e.currentTarget;
                setTimeout(() => {
                    iframe.contentWindow?.postMessage({ type: 'SET_MODE', value: mode }, '*');
                    if (mode === 'HABITAT') {
                         iframe.contentWindow?.postMessage({ type: 'CAMERA_MOVE', value: 'FOLLOW' }, '*');
                    }
                }, 500);
            }}
        />
    );
}, (prev, next) => prev.code === next.code && prev.mode === next.mode);

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

const PixuCard: React.FC<{ pet: Pixupet, onClick?: () => void, selected?: boolean }> = ({ pet, onClick, selected }) => (
    <div onClick={onClick} className={`w-full aspect-[3/4.5] neo-card flex flex-col p-2 cursor-pointer relative bg-white ${selected ? 'ring-4 ring-yellow-400' : ''}`}>
         <div className={`flex items-center justify-between px-2 py-1 rounded border-2 border-black ${ELEMENT_THEMES[pet.element]?.bg} ${ELEMENT_THEMES[pet.element]?.text} mb-2`}>
             <div className="flex items-center gap-1">
                 <span>{ELEMENT_THEMES[pet.element]?.icon}</span>
                 <span className="font-black uppercase text-xs truncate">{pet.name}</span>
             </div>
             <span className="font-black text-[10px]">Lv.{pet.level}</span>
         </div>
         <div className="flex-1 border-2 border-black rounded bg-gray-100 overflow-hidden relative mb-2">
             <img src={pet.cardArtUrl || pet.imageSource} className="w-full h-full object-cover" />
         </div>
         <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1">
             <StatBar label="HP" value={pet.currentHp || pet.hp} max={pet.maxHp || pet.hp} color="bg-green-400" />
             <StatBar label="ATK" value={pet.atk} max={200} color="bg-red-400" />
             <StatBar label="DEF" value={pet.def} max={200} color="bg-blue-400" />
             <StatBar label="SPD" value={pet.spd} max={200} color="bg-yellow-400" />
         </div>
         <div className="text-[8px] font-bold border-t-2 border-black pt-1 mt-1">
             <div className="flex justify-between">
                 <span>ABILITY: {pet.ability}</span>
                 <span>{pet.nature}</span>
             </div>
             <div className="mt-1 truncate text-gray-600">
                 MOVE: {pet.moves?.[0]?.name || 'Struggle'}
             </div>
         </div>
    </div>
);

// --- MAIN APP ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<Pixupet[]>([]);
  const [nexusMode, setNexusMode] = useState<'PEACE' | 'WILD_BATTLE'>('PEACE');
  const [wildEnemy, setWildEnemy] = useState<Pixupet | null>(null);
  const [playerPet, setPlayerPet] = useState<Pixupet | null>(null);
  const [enemyPet, setEnemyPet] = useState<Pixupet | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleTurn, setBattleTurn] = useState<'player' | 'enemy'>('player');
  const [scanMessage, setScanMessage] = useState<string>(SCAN_PHRASES[0]);
  const [hasGlitch, setHasGlitch] = useState(false);
  const [fusionSlots, setFusionSlots] = useState<{a: Pixupet | null, b: Pixupet | null}>({a: null, b: null});
  const [isFusionSelecting, setIsFusionSelecting] = useState<'a'|'b'|null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoLootMsg, setAutoLootMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wildEnemyRef = useRef<HTMLIFrameElement | null>(null); 
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
  
  useEffect(() => {
      const t = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(t);
  }, []);

  const saveGame = (u?: UserProfile, i?: Pixupet[]) => {
      if (u) { setUser(u); localStorage.setItem('pixupet_user_v1', JSON.stringify(u)); }
      if (i) { setInventory(i); localStorage.setItem('pixupet_inventory_v1', JSON.stringify(i)); }
  };

  const spawnFloatText = (text: string, color: string) => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, text, x: 50 + (Math.random()-0.5)*20, y: 40, color }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  useEffect(() => {
      const loop = setInterval(() => {
          if (gameState === 'NEXUS' && inventory.length > 0) {
              if (!hasGlitch && Math.random() < 0.02) {
                  setHasGlitch(true);
                  iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_DIRT', value: true }, '*');
              }

              if (nexusMode === 'PEACE') {
                   if (Math.random() < 0.02) triggerWildEncounter();
              } else if (nexusMode === 'WILD_BATTLE' && wildEnemy) {
                  const pet = inventory[0];
                  if ((pet.currentHp || 100) < (pet.maxHp || 100) * 0.3) {
                      setNexusMode('PEACE');
                      setWildEnemy(null);
                      iframeRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'IDLE' }, '*');
                      spawnFloatText("LOW HP! FLEEING!", "text-red-600");
                      return;
                  }

                  // ATTACK PHASE - Trigger Animation on Both
                  iframeRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'ATTACK' }, '*');
                  wildEnemyRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'ATTACK' }, '*');
                  
                  // Player hits Enemy
                  const dmgToEnemy = Math.max(5, Math.floor(pet.atk * 0.2 - (wildEnemy.def||0)*0.05));
                  const enemyNewHp = (wildEnemy.currentHp || 100) - dmgToEnemy;
                  spawnFloatText(`${dmgToEnemy}`, "text-white");

                  if (enemyNewHp <= 0) {
                      setNexusMode('PEACE');
                      setWildEnemy(null);
                      const xpGain = 20;
                      const coinGain = 10;
                      const newPetState = { ...pet, exp: pet.exp + xpGain };
                      if (newPetState.exp >= newPetState.maxExp) {
                          newPetState.level += 1;
                          newPetState.exp = 0;
                          newPetState.maxExp = Math.floor(newPetState.maxExp * 1.2);
                          newPetState.atk += 5; newPetState.hp += 10; newPetState.maxHp! += 10;
                          spawnFloatText("LEVEL UP!", "text-yellow-400");
                      }
                      const newInv = [newPetState, ...inventory.slice(1)];
                      const newUser = { ...user!, coins: user!.coins + coinGain };
                      saveGame(newUser, newInv);
                      setAutoLootMsg(`+${coinGain} COINS | +${xpGain} XP`);
                      setTimeout(() => setAutoLootMsg(null), 3000);
                      iframeRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'IDLE' }, '*');
                  } else {
                      const dmgToPlayer = Math.max(2, Math.floor((wildEnemy.atk||10)*0.15 - pet.def*0.05));
                      const playerNewHp = Math.max(0, (pet.currentHp || 100) - dmgToPlayer);
                      setWildEnemy({ ...wildEnemy, currentHp: enemyNewHp });
                      const newInv = [{ ...pet, currentHp: playerNewHp }, ...inventory.slice(1)];
                      saveGame(user!, newInv);
                      if (playerNewHp <= 0) {
                          setNexusMode('PEACE');
                          setWildEnemy(null);
                          spawnFloatText("FAINTED...", "text-red-600");
                          iframeRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'IDLE' }, '*');
                      }
                  }
              }
          }
          
          if (gameState === 'ARENA') {
              battlePlayerRef.current?.contentWindow?.postMessage({ type: 'CAMERA_MOVE', value: 'BACK' }, '*');
              battleEnemyRef.current?.contentWindow?.postMessage({ type: 'CAMERA_MOVE', value: 'FRONT' }, '*');
              battlePlayerRef.current?.contentWindow?.postMessage({ type: 'SET_MODE', value: 'BATTLE' }, '*');
              battleEnemyRef.current?.contentWindow?.postMessage({ type: 'SET_MODE', value: 'BATTLE' }, '*');
          }

      }, 1500);
      return () => clearInterval(loop);
  }, [gameState, inventory, hasGlitch, nexusMode, wildEnemy]);

  useEffect(() => {
      if (gameState === 'SCAN') {
          let i = 0;
          const interval = setInterval(() => {
              i = (i + 1) % SCAN_PHRASES.length;
              setScanMessage(SCAN_PHRASES[i]);
          }, 1500);
          return () => clearInterval(interval);
      }
  }, [gameState]);

  const handleCreateProfile = () => {
      const u: UserProfile = { name: 'Tamer', level: 1, exp: 0, coins: 100, joinedAt: Date.now(), battlesWon: 0, currentRank: 'E', inventory: [] };
      saveGame(u, []);
      setGameState('NEXUS');
  };

  const handleScan = async (img: string) => {
      setGameState('SCAN');
      try {
          const stats = await analyzeObject(img);
          let code = await generateVoxelScene(img, stats.visual_design);
          code = makeBackgroundTransparent(zoomCamera(hideBodyText(code), 1.0));
          let art = img;
          generateCardArt(stats.description, stats.name, stats.visual_design)
              .then(url => {
                  setInventory(prev => prev.map(p => p.id === newPet.id ? {...p, cardArtUrl: url} : p));
              }).catch(console.error);
          const newPet: Pixupet = {
              ...stats, voxelCode: code, imageSource: img, cardArtUrl: art,
              currentHp: stats.hp, maxHp: stats.hp, level: 1, exp: 0, maxExp: 100,
              hunger: 100, fatigue: 0
          };
          const newInv = [newPet, ...inventory];
          saveGame(user!, newInv);
          setGameState('NEXUS');
      } catch (e) {
          alert("Scan Failed. Try a clear image.");
          setGameState('NEXUS');
      }
  };

  const triggerWildEncounter = () => {
      if (!inventory[0]) return;
      const enemy = getRandomEnemy(user?.currentRank || 'E', inventory[0].level);
      // NERF: Very Weak Minions (0.3x)
      enemy.hp = Math.floor(enemy.hp * 0.3);
      enemy.atk = Math.floor(enemy.atk * 0.3);
      enemy.maxHp = enemy.hp;
      
      const voxel = getGenericVoxel(enemy.element);
      setWildEnemy({ ...enemy, voxelCode: voxel, currentHp: enemy.hp });
      setNexusMode('WILD_BATTLE');
      spawnFloatText("WILD ENCOUNTER!", "text-red-500");
      iframeRef.current?.contentWindow?.postMessage({ type: 'ANIM_STATE', value: 'CHASE' }, '*');
  };

  const startArenaBattle = () => {
      const pet = inventory[0];
      if (!pet) return;
      if (pet.hunger < 20) return alert("Pet is hungry!");
      const updatedPet = { ...pet, hunger: pet.hunger - 10, fatigue: pet.fatigue + 10 };
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

  useEffect(() => {
      if (gameState !== 'ARENA' || isBattleOver || !playerPet || !enemyPet) return;
      const turnTimer = setTimeout(() => {
          const attacker = battleTurn === 'player' ? playerPet : enemyPet;
          const defender = battleTurn === 'player' ? enemyPet : playerPet;
          const dmg = Math.max(1, Math.floor(attacker.atk * 0.5 - defender.def * 0.1));
          const newHp = Math.max(0, (defender.currentHp || 0) - dmg);
          if (battleTurn === 'player') {
              setEnemyPet({ ...enemyPet, currentHp: newHp });
              setBattleLog([`${attacker.name} attacks for ${dmg}!`, ...battleLog]);
          } else {
              setPlayerPet({ ...playerPet, currentHp: newHp });
              setBattleLog([`Enemy hits you for ${dmg}!`, ...battleLog]);
          }
          if (newHp <= 0) {
              setIsBattleOver(true);
              if (battleTurn === 'player') saveGame({ ...user!, coins: user!.coins + 50, battlesWon: user!.battlesWon + 1 });
          } else {
              setBattleTurn(battleTurn === 'player' ? 'enemy' : 'player');
          }
      }, 2000);
      return () => clearTimeout(turnTimer);
  }, [battleTurn, isBattleOver, gameState, playerPet, enemyPet]);

  if (gameState === 'SPLASH') {
      return (
          <div className="w-full h-screen bg-yellow-300 flex items-center justify-center p-4">
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] p-8 text-center animate-pop-in flex flex-col items-center">
                  <BrandLogo scale={1.5} className="mb-8" />
                  <p className="font-bold mb-8 bg-black text-white inline-block px-2 py-1">AFK GRINDING UPDATE</p>
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
                        onClick={() => {
                            if (isFusionSelecting) {
                                setFusionSlots(prev => ({ ...prev, [isFusionSelecting]: pet }));
                                setIsFusionSelecting(null);
                                setGameState('SYNTHESIS');
                            } else {
                                const others = inventory.filter(p => p.id !== pet.id);
                                saveGame(user!, [pet, ...others]);
                                setGameState('NEXUS');
                            }
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
      return (
          <div className="w-full h-screen bg-gray-900 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col md:flex-row">
                  <div className="relative flex-1 border-b-4 md:border-r-4 border-black bg-gray-800">
                       {playerPet && <VoxelViewer code={playerPet.voxelCode} onRef={ref => battlePlayerRef.current = ref} mode="BATTLE" />}
                       <div className="absolute bottom-4 left-4 bg-white border-2 border-black p-2 rounded shadow-[4px_4px_0px_0px_black] z-10">
                           <div className="font-black">{playerPet?.name}</div>
                           <div className="w-40 h-4 bg-gray-300 rounded-full overflow-hidden border border-black mt-1"><div className="h-full bg-green-500 transition-all duration-500" style={{width: `${(playerPet?.currentHp!/playerPet?.maxHp!)*100}%`}}></div></div>
                           <div className="text-xs font-bold mt-1">{playerPet?.currentHp}/{playerPet?.maxHp} HP</div>
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
      <div className={`w-full h-screen relative overflow-hidden flex flex-col ${activePet ? HABITAT_PATTERNS[activePet.element] || 'bg-gray-100' : 'bg-gray-100'}`}>
          
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
                {/* LAYER 0: 3D WORLD */}
                <div className="absolute inset-0 z-0">
                    <VoxelViewer code={activePet.voxelCode} onRef={ref => iframeRef.current = ref} mode="HABITAT" />
                </div>

                {/* LAYER 1: OVERLAYS (WILD ENEMY, DAMAGE TEXT) */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {nexusMode === 'WILD_BATTLE' && wildEnemy && (
                        <div className="absolute inset-0 flex items-center justify-end pr-8">
                             {/* Ensure transparency and overlay positioning */}
                             <div className="w-1/2 h-1/2 relative filter drop-shadow-[0_0_10px_rgba(255,0,0,0.5)] animate-bounce pointer-events-auto">
                                 <VoxelViewer code={wildEnemy.voxelCode} onRef={ref => wildEnemyRef.current = ref} className="w-full h-full" />
                                 <div className="absolute -top-10 left-0 right-0 text-center pointer-events-none">
                                     <span className="bg-red-500 text-white font-black px-4 py-1 border-2 border-black text-xl shadow-[4px_4px_0px_0px_black]">WILD {wildEnemy.name}</span>
                                     <div className="w-32 h-2 bg-gray-300 border border-black mx-auto mt-1"><div className="h-full bg-red-600" style={{width: `${(wildEnemy.currentHp!/wildEnemy.maxHp!)*100}%`}}></div></div>
                                 </div>
                             </div>
                        </div>
                    )}
                    {floatingTexts.map(ft => (
                        <div key={ft.id} className={`absolute font-black text-2xl stroke-black ${ft.color} animate-float-up`} style={{ left: `${ft.x}%`, top: `${ft.y}%`, textShadow: '2px 2px 0 #000' }}>{ft.text}</div>
                    ))}
                </div>

                {/* LAYER 2: HUD (TOP) */}
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
                        {autoLootMsg && <div className="bg-yellow-300 border-2 border-black px-3 py-1 font-black text-xs animate-pop-in">{autoLootMsg}</div>}
                        {hasGlitch && (
                            <button onClick={() => { setHasGlitch(false); iframeRef.current?.contentWindow?.postMessage({type:'TOGGLE_DIRT', value:false}, '*'); }} className="neo-btn bg-red-500 text-white p-3 rounded-full animate-bounce shadow-lg"><NeonIcon path={ICONS.TRASH} /></button>
                        )}
                        <div className="bg-white border-2 border-black px-4 py-2 rounded-full font-black flex flex-col items-end shadow-[4px_4px_0px_0px_black]">
                            <span>💰 {user?.coins}</span>
                            <span className="text-[10px] text-gray-500">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>

                {/* LAYER 3: CONTROLS (BOTTOM) */}
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
