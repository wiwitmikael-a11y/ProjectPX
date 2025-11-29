
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { analyzeObject, getGenericVoxel, generateProceduralBoss, generateBattleCommentary, generatePetReaction, generateMission, analyzeArtifact } from './services/gemini';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, MonsterStats, LOCATIONS_DB, LocationNode, generateStarterOptions, EVO_THRESHOLDS, getProceduralMonsterArt, getRandomEventText, getActionFromText, getPetSpeech, EMOTE_ICONS, MONSTER_DB, MonsterEntry, checkDiscovery, assignMoves, Move, PARTS_DB, PartDefinition, AttachedPart, calculateStats, GACHA_POOLS, ActiveMission } from './services/gameData';
import { IconBag, IconBook, IconCards, IconCart, IconCoin, IconMap, IconScan, IconSkull, IconTreasure, ItemIcon, IconCapsule, IconTrash } from './components/Icons';
import { VoxelViewer, PixuCard } from './components/Shared';

// --- TYPES ---
type GameState = 'SPLASH' | 'ONBOARDING' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'COLLECTION' | 'SHOP' | 'ITEMS' | 'EXPLORE' | 'CODEX' | 'ENGINEER' | 'GACHA' | 'MISSION';

const SAVE_VERSION = 'v30.0_SINGULARITY_EDITION'; 

const IconWallet = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#9945FF" stroke="black" strokeWidth="2"/>
        <path d="M22 12h-4c-1.1 0-2 .9-2 2v4h6v-6z" fill="#14F195" stroke="black" strokeWidth="2"/>
        <circle cx="20" cy="15" r="1.5" fill="black"/>
    </svg>
);

const IconHunt = () => (
     <svg viewBox="0 0 24 24" className="w-10 h-10 animate-pulse">
        <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="black" strokeWidth="2" />
        <path d="M12 2v10M2 12h10" stroke="black" strokeWidth="0" />
        <path d="M12 7l-2 5 2 5 2-5z" fill="white" />
        <path d="M7 12l5-2 5 2-5 2z" fill="white" />
    </svg>
);

const IconWrench = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M14.7 3.3c-1.3-1.3-3.4-1.3-4.7 0l-1.3 1.3 6 6 1.3-1.3c1.3-1.3 1.3-3.4 0-4.7l-1.3-1.3zM7.3 10.7l-4.6 4.6c-.4.4-.4 1 0 1.4l2.6 2.6c.4.4 1 .4 1.4 0l4.6-4.6-4-4z" fill="#60A5FA" stroke="black" strokeWidth="2"/>
    </svg>
);

interface UserProfile {
  name: string;
  level: number;
  exp: number;
  coins: number; 
  currentLocation: string; 
  joinedAt: number;
  inventory: string[]; 
  currentRank: string;
  seen: string[]; 
  caught: string[];
  lastSaveTime?: number;
  lastDailyBonus?: number; 
  kills?: number; 
  activeMission?: ActiveMission; 
}

interface FloatingText { id: number; text: string; x: number; y: number; color: string; }

// --- MAIN APP ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [user, setUser] = useState<UserProfile>({ 
      name: 'Tamer', level: 1, exp: 0, coins: 200, currentLocation: 'loc_starter', joinedAt: Date.now(), inventory: [], currentRank: 'Noob', seen: [], caught: [], kills: 0 
  });
  const [inventory, setInventory] = useState<any[]>([]);
  const [activePetIndex, setActivePetIndex] = useState<number>(0);
  const [starterOptions, setStarterOptions] = useState<any[]>([]);
  
  // Modals & Overlays
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false); 
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState<any>(null);
  const [notifs, setNotifs] = useState<FloatingText[]>([]);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [statusText, setStatusText] = useState("System Online");
  const [preEventEmote, setPreEventEmote] = useState<string | null>(null);
  const [expeditionReport, setExpeditionReport] = useState<{coins: number, exp: number, timeAway: number} | null>(null);

  // ENHANCED VISUALS
  const [showBattleOverlay, setShowBattleOverlay] = useState<any>(null); 
  const [isAutoMode, setIsAutoMode] = useState(false); 
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isSummoningBoss, setIsSummoningBoss] = useState(false); 
  const [missionLoading, setMissionLoading] = useState(false);

  // GACHA STATE
  const [gachaState, setGachaState] = useState<'IDLE' | 'DROPPING' | 'REVEAL'>('IDLE');
  const [gachaResult, setGachaResult] = useState<any>(null);

  // Menus
  const [statsOpen, setStatsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  // Engineer Mode State
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Reality Sync (Time Detection)
  const [isNight, setIsNight] = useState(false);

  // Interactive State
  const [isPetIdle, setIsPetIdle] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // FX
  const [purchaseAnim, setPurchaseAnim] = useState<string | null>(null);

  const activePet = inventory[activePetIndex];
  const battleStats = activePet ? calculateStats(activePet) : null;
  const location = LOCATIONS_DB[user.currentLocation];
  const logScrollRef = useRef<HTMLDivElement>(null);

  // --- TIME DETECTION ---
  useEffect(() => {
    const checkTime = () => {
        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18); 
    };
    checkTime();
    const interval = setInterval(checkTime, 60000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      setStarterOptions(generateStarterOptions());
  }, []);

  // --- LOAD / SAVE ---
  useEffect(() => {
      const saved = localStorage.getItem(`pixupet_save_${SAVE_VERSION}`);
      if (saved) {
          const data = JSON.parse(saved);
          setUser(data.user);
          setInventory(data.inventory);
          if (data.user.lastSaveTime && data.inventory.length > 0) {
              const diffMinutes = Math.floor((Date.now() - data.user.lastSaveTime) / 60000);
              if (diffMinutes > 10) setExpeditionReport({ timeAway: diffMinutes, exp: Math.min(diffMinutes * 5, 2000), coins: Math.min(diffMinutes * 2, 1000) });
          }
          setGameState('NEXUS');
      }
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (inventory.length > 0) {
              setInventory(prev => prev.map(p => ({ 
                  ...p, hunger: Math.max(0, p.hunger - 2), happiness: Math.max(0, (p.happiness || 100) - 1), fatigue: Math.max(0, (p.fatigue || 0) - 1) 
              })));
          }
      }, 60000); 
      return () => clearInterval(interval);
  }, [inventory.length]);

  useEffect(() => {
      if (user.level > 0 && inventory.length > 0) {
        localStorage.setItem(`pixupet_save_${SAVE_VERSION}`, JSON.stringify({ user: { ...user, lastSaveTime: Date.now() }, inventory }));
      }
  }, [user, inventory]);

  // --- SINGULARITY: SENTIENT PET CHAT ---
  useEffect(() => {
      if (gameState !== 'NEXUS' || isAutoMode || !activePet || isPetIdle) return;
      
      const chatInterval = setInterval(async () => {
          if(Math.random() > 0.7) {
              const context = `Location: ${location.name}. Time: ${isNight?'Night':'Day'}. Hunger: ${activePet.hunger}.`;
              const speech = await generatePetReaction(activePet, context);
              triggerSpeech(speech);
          }
      }, 15000); // Every 15s chance to talk

      return () => clearInterval(chatInterval);
  }, [gameState, isAutoMode, activePet, isPetIdle, location, isNight]);

  const triggerSpeech = (text: string) => {
      if(speechBubble) return;
      setSpeechBubble(text);
      if(speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setSpeechBubble(null), 4000);
  };

  // --- SINGULARITY: MISSION SYSTEM ---
  const requestMission = async () => {
      if(user.activeMission?.isActive) {
          showFloatingText("FINISH CURRENT MISSION!", "text-red-500");
          return;
      }
      setMissionLoading(true);
      const missionData = await generateMission(user.level, location.name);
      if(missionData) {
          const newMission: ActiveMission = {
              id: `mission_${Date.now()}`,
              title: missionData.title || "Unknown Signal",
              description: missionData.description || "Investigate the area.",
              targetName: missionData.targetName || "Anomalies",
              difficulty: missionData.difficulty || "Medium",
              rewards: missionData.rewards || "Credits",
              progress: 0,
              goal: 5, // Simple "Kill 5 things" goal for now
              isActive: true
          };
          setUser(u => ({ ...u, activeMission: newMission }));
          addLog(`MISSION RECEIVED: ${newMission.title}`);
      } else {
          showFloatingText("COMMUNICATION ERROR", "text-red-500");
      }
      setMissionLoading(false);
  };

  // --- IFRAME HANDLER ---
  useEffect(() => {
      const handler = (e: MessageEvent) => {
          if (e.data.type === 'PART_PLACED') {
              const { partId, position, normal } = e.data;
              const def = PARTS_DB[partId];
              const partIdx = user.inventory.indexOf(partId);
              if (partIdx > -1) {
                  const newInv = [...user.inventory]; newInv.splice(partIdx, 1);
                  setUser(u => ({ ...u, inventory: newInv }));
                  const updated = [...inventory];
                  if (!updated[activePetIndex].parts) updated[activePetIndex].parts = [];
                  updated[activePetIndex].parts.push({
                      id: `${partId}_${Date.now()}`, partId: partId, partType: def.voxelShapeType, 
                      position: position, faceNormal: normal, rotation: { x: 0, y: 0, z: 0 }
                  });
                  setInventory(updated);
                  showFloatingText("PART ATTACHED!", "text-blue-400");
              }
          }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
  }, [user.inventory, inventory, activePetIndex]);

  const handleNewGame = () => {
      localStorage.removeItem(`pixupet_save_${SAVE_VERSION}`);
      setUser({ name: 'Tamer', level: 1, exp: 0, coins: 500, currentLocation: 'loc_starter', joinedAt: Date.now(), inventory: ['part_leg_basic', 'part_sensor_lite', 'part_arm_stubby'], currentRank: 'Noob', seen: [], caught: [] });
      setInventory([]);
      setStarterOptions(generateStarterOptions());
      setGameState('ONBOARDING');
  };

  // --- AUTO-MODE LOGIC (THE INFINITY ENGINE) ---
  useEffect(() => {
      if (!isAutoMode || gameState !== 'NEXUS' || !activePet || isSummoningBoss) return;

      const autoLoop = setInterval(async () => {
          const currentPet = inventory[activePetIndex];
          
          // AUTO SUSTAIN
          if (currentPet.hunger < 40) {
              const foodId = user.inventory.find(id => ITEMS_DB[id]?.type === 'Food');
              if (foodId) { consumeItem(foodId); addLog(`AUTO: Consumed ${ITEMS_DB[foodId].name}`); return; }
          }
          if (currentPet.currentHp < (currentPet.maxHp * 0.4)) {
               const potId = user.inventory.find(id => ITEMS_DB[id]?.type === 'Potion' || ITEMS_DB[id]?.type === 'Consumable');
               if (potId) { consumeItem(potId); addLog(`AUTO: Used ${ITEMS_DB[potId].name}`); return; }
          }

          // INFINITY ENGINE: BOSS SPAWN CHECK
          const killCount = user.kills || 0;
          if (killCount > 0 && killCount % 10 === 0) {
              clearInterval(autoLoop);
              setIsSummoningBoss(true);
              setStatusText("ANOMALY DETECTED...");
              addLog("WARNING: DIMENSIONAL RIFT OPENING");
              
              const bossData = await generateProceduralBoss(LOCATIONS_DB[user.currentLocation].name, user.level);
              
              if (bossData) {
                  const bossEnemy = {
                      id: `boss_${Date.now()}`, name: bossData.name, element: bossData.element || 'Dark',
                      level: user.level + 5, stats: bossData.stats || { hp: 500, atk: 50, def: 50, spd: 20 },
                      voxelCode: getGenericVoxel(bossData.element, 'BIPED', 'God', bossData.visualTraits, bossData.name),
                      description: bossData.description
                  };
                  
                  const narrative = await generateBattleCommentary(activePet.name, bossEnemy.name, location.name);
                  
                  addExp(bossEnemy.level * 100, true);
                  addCoins(bossEnemy.level * 50, true);
                  addItem('part_halo', true);
                  addLog(`BOSS DEFEATED: ${bossEnemy.name}`);
                  addLog(`> "${narrative}"`);
                  setUser(u => ({ ...u, kills: (u.kills || 0) + 1 }));

                  const iframe = document.querySelector('iframe');
                  if(iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'SET_ACTION', value: 'ATTACK' }, '*');
                  
              } else {
                  addLog("Boss Summon Failed (Signal Lost)");
              }
              setIsSummoningBoss(false);
              return; 
          }

          // STANDARD MOB BATTLE
          setStatusText("AUTO_ENGAGED");
          const enemy = getRandomEnemy(user.currentLocation, currentPet.level, getGenericVoxel);
          
          addExp(enemy.level * 40, true);
          addCoins(enemy.level * 20, true);
          setUser(u => {
              let nextU = { ...u, kills: (u.kills || 0) + 1 };
              // Mission Progress
              if (u.activeMission && u.activeMission.isActive) {
                   const prog = u.activeMission.progress + 1;
                   if (prog >= u.activeMission.goal) {
                       addLog(`MISSION COMPLETE: ${u.activeMission.title}`);
                       showFloatingText("MISSION COMPLETE", "text-green-500");
                       addCoins(500, true);
                       nextU.activeMission = { ...u.activeMission, isActive: false, progress: prog };
                   } else {
                       nextU.activeMission = { ...u.activeMission, progress: prog };
                   }
              }
              return nextU;
          });
          
          if(Math.random() > 0.5) {
               const loot = getLootDrop(user.currentLocation);
               addItem(loot, true);
               addLog(`DEFEATED ${enemy.name} [+${loot}]`);
          } else {
               addLog(`DEFEATED ${enemy.name}`);
          }
          
          const iframe = document.querySelector('iframe');
          if(iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'SET_ACTION', value: 'ATTACK' }, '*');

      }, 3000);

      return () => clearInterval(autoLoop);
  }, [isAutoMode, gameState, user.inventory, inventory, activePetIndex, user.kills, isSummoningBoss, user.activeMission]);

  const addLog = (msg: string) => {
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString().slice(0,5)}] ${msg}`, ...prev].slice(0, 10));
  };

  const consumeItem = async (itemId: string) => {
      // SINGULARITY: ARTIFACT ANALYSIS
      if (itemId === 'unidentified_artifact') {
          showFloatingText("ANALYZING...", "text-blue-500");
          const artifactData = await analyzeArtifact(user.level);
          if(artifactData) {
               // In a real app we would add this item definition to the DB dynamically
               // For this demo, we simulate a massive buff
               showFloatingText(`ARTIFACT DECODED: ${artifactData.name}`, "text-purple-400");
               addCoins(1000, true);
               const inv = [...user.inventory];
               const idx = inv.indexOf(itemId);
               if(idx > -1) inv.splice(idx, 1);
               setUser(u => ({ ...u, inventory: inv }));
          }
          return;
      }

      const item = ITEMS_DB[itemId];
      if(!item) return;
      const inv = [...user.inventory];
      const idx = inv.indexOf(itemId);
      if(idx > -1) inv.splice(idx, 1);
      setUser(u => ({ ...u, inventory: inv }));
      const updated = [...inventory];
      const p = updated[activePetIndex];
      if(item.effect?.stat === 'hp') p.currentHp = Math.min(p.maxHp, p.currentHp + item.effect.val);
      if(item.effect?.stat === 'hunger') p.hunger = Math.min(100, p.hunger + item.effect.val);
      if(itemId === 'nano_repair_kit') { p.currentHp = p.maxHp; p.fatigue = 0; }
      setInventory(updated);
  };

  // --- STANDARD GAME LOOP ---
  useEffect(() => {
      if (gameState !== 'NEXUS' || activeBattle || activeEvent || isAnalyzing || preEventEmote || isMaterializing || isAutoMode) return;
      const interval = setInterval(() => {
          if (Math.random() > 0.8 && !isPetIdle && activePet) { 
              const txt = getRandomEventText(user.currentLocation);
              setStatusText(txt);
          }
      }, 8000); 
      return () => clearInterval(interval);
  }, [gameState, activeBattle, activeEvent, user.currentLocation, isAnalyzing, isPetIdle, preEventEmote, isMaterializing, activePet, isAutoMode]);

  const triggerRandomEvent = async () => {
      if(activePet.fatigue >= 80) { showFloatingText("TOO TIRED!", "text-red-500"); return; }
      const updated = [...inventory];
      updated[activePetIndex].fatigue = (updated[activePetIndex].fatigue || 0) + 10; 
      updated[activePetIndex].hunger = Math.max(0, updated[activePetIndex].hunger - 5);
      setInventory(updated);

      const rand = Math.random();
      if (rand > 0.4) {
          setPreEventEmote(EMOTE_ICONS.BATTLE);
          const enemy = getRandomEnemy(user.currentLocation, activePet.level, getGenericVoxel);
          const { isNew, updates } = checkDiscovery(user, enemy.speciesId || 'unknown', 'SEEN');
          if(isNew) setUser(u => ({ ...u, ...updates }));

          setShowBattleOverlay({ enemy, player: activePet });
          await new Promise(r => setTimeout(r, 2000));
          setShowBattleOverlay(null);
          setPreEventEmote(null);

          const win = true; 
          const eventResult = {
              type: 'BATTLE', title: 'VICTORY!', enemyName: enemy.name,
              logs: ["Combat initiated...", "Enemy neutralized!"],
              rewards: { exp: enemy.level * 30, coins: enemy.level * 15 }
          };
          
          addExp(eventResult.rewards.exp, true);
          addCoins(eventResult.rewards.coins, true);
          setUser(u => ({ ...u, kills: (u.kills || 0) + 1 }));
          setActiveEvent(eventResult);
      } else {
          setPreEventEmote(EMOTE_ICONS.TREASURE);
          await new Promise(r => setTimeout(r, 800));
          setPreEventEmote(null);
          const item = getLootDrop(user.currentLocation) || 'pixel_pizza';
          addItem(item, true);
          setActiveEvent({ type: 'TREASURE', title: 'SCAVENGE', logs: ["Item recovered!"], rewards: { items: [ITEMS_DB[item].name] } });
      }
  };

  const addExp = (amount: number, silent: boolean = false) => {
      const updated = [...inventory];
      const pet = updated[activePetIndex];
      pet.exp += amount;
      if (!silent) showFloatingText(`+${amount} XP`, 'text-yellow-400');
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

  const addCoins = (amt: number, silent: boolean = false) => {
      setUser(u => ({ ...u, coins: u.coins + amt }));
      if (!silent) showFloatingText(`+${amt} G`, 'text-yellow-300');
  };

  const addItem = (itemId: string, silent: boolean = false) => {
      setUser(u => ({ ...u, inventory: [...u.inventory, itemId] }));
      if (!silent) showFloatingText(`+ ${ITEMS_DB[itemId]?.name || PARTS_DB[itemId]?.name}!`, 'text-green-400');
  };

  const handleRecyclePart = (partId: string) => {
      const part = PARTS_DB[partId]; if(!part) return;
      const refund = Math.floor(part.cost * 0.2);
      const inv = [...user.inventory]; const idx = inv.indexOf(partId);
      if(idx > -1) { inv.splice(idx, 1); setUser(u => ({ ...u, inventory: inv })); addCoins(refund, true); setSelectedPartId(null); }
  };

  const handleGachaPull = async (poolType: 'STANDARD' | 'PREMIUM' | 'GOD_MODE') => {
      const poolData = GACHA_POOLS[poolType];
      if(user.coins < poolData.cost) { showFloatingText("NEED COINS!", "text-red-500"); return; }
      addCoins(-poolData.cost, true);
      setGachaState('DROPPING');
      await new Promise(r => setTimeout(r, 1500));
      setGachaState('REVEAL');
      const itemId = poolData.pool[Math.floor(Math.random() * poolData.pool.length)];
      setGachaResult(ITEMS_DB[itemId] || PARTS_DB[itemId]);
      addItem(itemId, true);
  };

  const showFloatingText = (text: string, color: string) => {
      const id = Date.now() + Math.random();
      setNotifs(prev => [...prev, { id, text, x: 50, y: 40, color }]);
      setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 3000); 
  };

  const handleScan = async () => {
      if (!scanPreview) return;
      setIsAnalyzing(true);
      try {
          const traits = await analyzeObject(scanPreview);
          if(!traits) throw new Error("AI Failed");
          
          if(!traits.hp) traits.hp = 100;
          const voxelCode = getGenericVoxel(traits.element, traits.bodyType, 'Noob', traits.visualTraits, traits.name);
          const initialMoves = assignMoves(traits.element, 1);

          const newPet: any = {
              id: `pet_${Date.now()}`, dateCreated: Date.now(), ...traits,
              voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 80, fatigue: 0, happiness: 80,
              stage: 'Noob', rank: 'Common', potential: 50, currentHp: traits.hp, maxHp: traits.hp,
              ability: "Matrix Born", moves: initialMoves, parts: [],
              imageSource: scanPreview, isMinted: false
          };
          setInventory([...inventory, newPet]);
          setActivePetIndex(inventory.length); 
          addItem('part_leg_basic', true);
          
          setIsAnalyzing(false); setIsMaterializing(true); setScanPreview(null);
          setTimeout(() => { setIsMaterializing(false); setGameState('NEXUS'); showFloatingText("LIFEFORM GENERATED", "text-green-400"); }, 2000);

      } catch (e) { setIsAnalyzing(false); alert("Scan failed. Try a clearer image."); }
  };

  const handleStarterSelect = (starter: any) => {
      const voxelCode = getGenericVoxel(starter.element, starter.bodyType, 'Noob', starter.visualTraits, starter.name);
      const initialMoves = assignMoves(starter.element, 1);
      const newPet: any = {
          id: `starter_${Date.now()}`, dateCreated: Date.now(), name: starter.name, element: starter.element,
          description: starter.description, visual_design: starter.visual_design, bodyType: starter.bodyType,
          visualTraits: starter.visualTraits, rarity: 'Common', nature: 'Brave',
          hp: starter.stats.hp, maxHp: starter.stats.hp, currentHp: starter.stats.hp,
          atk: starter.stats.atk, def: starter.stats.def, spd: starter.stats.spd, int: 10,
          voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 100, fatigue: 0, happiness: 100,
          stage: 'Noob', rank: 'Starter', potential: 80, ability: 'Starter Will', moves: initialMoves, parts: [], isMinted: false
      };
      setInventory([newPet]); setActivePetIndex(0);
      setGameState('NEXUS');
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden font-sans select-none text-black">
      {/* 3D VIEWER LAYER */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {activePet && <VoxelViewer 
            code={activePet.voxelCode} 
            mode={gameState === 'ENGINEER' ? 'ENGINEER' : 'HABITAT'}
            action={isAutoMode ? (statusText.includes('Target') || statusText.includes('BOSS') ? 'ATTACK' : 'RUN') : getActionFromText(statusText)} 
            envData={{ envType: location.environmentType || 'Grass', isNight: isNight }}
            equipment={{ ...activePet.equipment, parts: activePet.parts }}
            onInteract={null}
            onStateChange={(state) => setIsPetIdle(state === 'ENTER_IDLE')}
            preEvent={preEventEmote || undefined}
            eventActive={!!activeBattle || !!activeEvent || !!preEventEmote || !!showBattleOverlay}
        />}
      </div>

      {/* --- SENTIENT PET CHAT BUBBLE --- */}
      {speechBubble && gameState === 'NEXUS' && !isAutoMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150px] z-50 pointer-events-none">
              <div className="bg-white/90 border-4 border-black px-4 py-2 rounded-xl text-xs font-black relative max-w-[200px] text-center shadow-[4px_4px_0_#000] pop-in">
                  {speechBubble}
                  <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 border-r-4 border-b-4 border-black rotate-45"></div>
              </div>
          </div>
      )}

      {/* --- MISSION HUD --- */}
      {user.activeMission?.isActive && gameState === 'NEXUS' && !isSummoningBoss && (
          <div className="absolute top-24 right-2 z-40">
               <div className="bg-blue-900/80 border border-blue-400 p-2 rounded text-blue-200 text-xs w-48 font-mono">
                   <div className="text-yellow-400 font-bold mb-1">active_mission.exe</div>
                   <div className="truncate font-bold text-white">{user.activeMission.title}</div>
                   <div className="text-[10px] opacity-70 mb-1">{user.activeMission.targetName}</div>
                   <div className="w-full bg-blue-950 h-2 rounded-full overflow-hidden">
                       <div className="bg-blue-400 h-full transition-all" style={{width: `${(user.activeMission.progress/user.activeMission.goal)*100}%`}}></div>
                   </div>
                   <div className="text-right text-[9px] mt-1">{user.activeMission.progress} / {user.activeMission.goal}</div>
               </div>
          </div>
      )}

      {/* --- BOSS SUMMONING OVERLAY --- */}
      {isSummoningBoss && (
          <div className="absolute inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center pointer-events-none">
               <div className="text-6xl animate-spin mb-4">🌀</div>
               <div className="text-red-500 font-black text-4xl animate-pulse text-center tracking-widest font-['Bangers'] drop-shadow-[0_0_20px_red]">
                   DIMENSIONAL RIFT DETECTED
               </div>
               <div className="text-white/70 font-mono mt-4 text-sm typing-effect">Constructing Entity from Void...</div>
          </div>
      )}

      {/* --- AUTO HUD --- */}
      {isAutoMode && !isSummoningBoss && (
          <div className="absolute top-24 left-2 z-40 pointer-events-none">
              <div className="bg-black/50 p-2 rounded border border-green-500/30 text-[10px] font-mono text-green-400 w-48 shadow-[0_0_10px_rgba(0,255,0,0.2)]">
                  <div className="border-b border-green-500/30 mb-1 pb-1 font-bold flex justify-between">
                      <span>SYSTEM LOG</span>
                      <span>KILLS: {user.kills}</span>
                  </div>
                  <div className="flex flex-col gap-1 opacity-80 h-32 overflow-hidden">
                      {systemLogs.map((log, i) => (
                          <div key={i} className="truncate">{log}</div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- NOTIFICATIONS --- */}
      {notifs.map((n, idx) => (
          <div key={n.id} className={`absolute z-[60] text-lg font-black ${n.color} float-down pointer-events-none w-full text-center drop-shadow-[2px_2px_0_#000] stroke-black text-stroke`} 
               style={{top: `${100 + idx * 35}px`}}>
              {n.text}
          </div>
      ))}

      {/* --- HUD HEADER --- */}
      {gameState !== 'SPLASH' && gameState !== 'ONBOARDING' && (
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start z-50 pointer-events-none safe-top">
          <div className="bg-white/30 backdrop-blur-md border border-white/20 rounded-2xl p-2 pointer-events-auto cursor-pointer hover:scale-105 transition-transform" onClick={()=>setStatsOpen(true)}>
              <div className="flex flex-col text-white drop-shadow-md">
                  <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="bg-black/50 px-1 rounded">LV.{activePet?.level}</span> {activePet?.name}
                  </div>
                  <div className="w-32 h-3 bg-black/50 rounded-full mt-1 overflow-hidden border border-white/30">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{width: `${(activePet?.exp / activePet?.maxExp)*100}%`}}></div>
                  </div>
              </div>
          </div>

          <div className="flex flex-col items-end">
              <div className="font-black text-yellow-400 flex items-center gap-1 text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"><IconCoin /> {user.coins}</div>
              {gameState === 'NEXUS' && (
                  <div className="flex flex-col gap-1 items-end">
                      <button onClick={() => setIsAutoMode(!isAutoMode)} 
                          className={`mt-2 px-3 py-1 font-black text-xs rounded border-2 pointer-events-auto shadow-md transition-all ${isAutoMode ? 'bg-red-500 border-red-300 text-white animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                          {isAutoMode ? 'AUTO [ON]' : 'AUTO [OFF]'}
                      </button>
                      <button onClick={requestMission} disabled={missionLoading || user.activeMission?.isActive}
                          className={`mt-1 px-3 py-1 font-black text-xs rounded border-2 pointer-events-auto shadow-md transition-all ${missionLoading ? 'bg-yellow-600' : 'bg-yellow-500 border-yellow-300 text-black hover:scale-105'}`}>
                          {missionLoading ? 'DOWNLOADING...' : (user.activeMission?.isActive ? 'MISSION ACTIVE' : 'NEW MISSION')}
                      </button>
                  </div>
              )}
          </div>
      </div>
      )}

      {/* --- ITEMS UI (Updated for Artifacts) --- */}
      {itemsOpen && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-3xl h-[60vh] flex flex-col overflow-hidden relative">
                   <button onClick={() => setItemsOpen(false)} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-2 rounded-full font-black text-xs z-20">◀ BACK</button>
                   <div className="bg-orange-500 p-4 text-white font-black"><IconBag /> INVENTORY</div>
                   <div className="flex-1 overflow-y-auto p-4 bg-gray-100 grid grid-cols-4 gap-2 pb-16">
                      {user.inventory.map((itemId, idx) => (
                          <div key={idx} onClick={() => { if(ITEMS_DB[itemId]?.type==='Food' || ITEMS_DB[itemId]?.type==='Artifact' || ITEMS_DB[itemId]?.type==='Consumable') consumeItem(itemId); }} 
                               className="aspect-square bg-white border border-gray-300 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden">
                              {ITEMS_DB[itemId] ? <div className="w-10 h-10"><ItemIcon item={ITEMS_DB[itemId]}/></div> : <span className="text-[8px]">{PARTS_DB[itemId]?.name}</span>}
                              {itemId === 'unidentified_artifact' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[8px] text-white font-bold animate-pulse">?</div>}
                          </div>
                      ))}
                   </div>
              </div>
          </div>
      )}
      
      {/* ... (Explore, Maps, Gacha - Kept same as previous) ... */}
      {exploreOpen && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col">
              <div className="p-4 flex justify-between items-center"><h2 className="text-white font-black text-2xl">WORLD MAP</h2><button onClick={()=>setExploreOpen(false)} className="text-white bg-red-500 px-4 py-1 rounded-full font-black text-xs">CLOSE</button></div>
              <div className="flex-1 overflow-auto relative bg-[#0f172a] p-8">
                  <div className="relative w-[800px] h-[800px]">
                      {Object.values(LOCATIONS_DB).map(loc => (
                          <div key={loc.id} onClick={() => { setUser(u=>({...u, currentLocation: loc.id})); setExploreOpen(false); }}
                              className={`absolute w-20 h-20 -ml-10 -mt-10 flex flex-col items-center justify-center cursor-pointer ${user.currentLocation===loc.id?'scale-110 z-20':''}`} style={{left:`${loc.x}%`, top:`${loc.y}%`}}>
                              <div className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center ${loc.color}`}>{ELEMENT_THEMES[loc.enemyTheme[0]]?.icon}</div>
                              <div className="mt-2 bg-black/80 text-white text-[9px] px-2 rounded">{loc.name}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- MAIN GAMEPLAY BUTTONS --- */}
      {gameState === 'NEXUS' && (
        <>
          <div className={`absolute bottom-32 left-0 right-0 flex justify-center z-40 ${isAutoMode ? 'pointer-events-none opacity-50' : 'pointer-events-auto'}`}>
              <button onClick={triggerRandomEvent} className="bg-red-500 text-white border-4 border-white/50 px-8 py-3 rounded-full font-black text-xl shadow-[0_10px_20px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2 backdrop-blur-sm">
                  <IconHunt /> HUNT
              </button>
          </div>
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-2 flex items-end gap-2 z-50 shadow-2xl safe-bottom min-w-[340px] justify-between pointer-events-auto transition-all ${isAutoMode ? 'opacity-30 pointer-events-none' : ''}`}>
              <button onClick={()=>{ setGameState('COLLECTION') }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-white group-hover:scale-110 transition-transform"><IconCards /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Cards</span>
              </button>
              <button onClick={()=>{ setGameState('ENGINEER') }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-blue-300 group-hover:scale-110 transition-transform"><IconWrench /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Build</span>
              </button>
               <button onClick={()=>{ setItemsOpen(true) }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-white group-hover:scale-110 transition-transform"><IconBag /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Bag</span>
              </button>
              <div className="relative -top-6">
                  <button onClick={()=>setGameState('SCAN')} className="bg-gradient-to-tr from-yellow-400 to-orange-500 w-16 h-16 rounded-full border-4 border-white/50 flex items-center justify-center shadow-[0_10px_20px_rgba(251,191,36,0.5)] hover:-translate-y-2 active:translate-y-1 transition-all overflow-hidden z-30">
                      <div className="text-white drop-shadow-md relative z-10 scale-125"><IconScan /></div>
                  </button>
              </div>
              <button onClick={()=>{ setGameState('GACHA') }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-pink-300 group-hover:scale-110 transition-transform"><IconCapsule /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Gacha</span>
              </button>
              <button onClick={()=>{ setExploreOpen(true) }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-green-300 group-hover:scale-110 transition-transform"><IconMap /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Map</span>
              </button>
              <button onClick={()=>{ setShopOpen(true) }} className="flex-1 flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/20 active:scale-90 transition-all group">
                  <div className="text-purple-300 group-hover:scale-110 transition-transform"><IconCart /></div> <span className="text-[8px] font-bold text-white uppercase mt-1">Shop</span>
              </button>
          </div>
        </>
      )}

      {/* --- SCAN --- */}
      {gameState === 'SCAN' && (
      <div className="w-full h-screen bg-black flex flex-col relative overflow-hidden">
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
              {!scanPreview ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-black">CAMERA ACTIVE</div>
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-50">
                      <label className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/50 pointer-events-auto cursor-pointer backdrop-blur-md">
                          <IconCards />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => setScanPreview(reader.result as string);
                                      reader.readAsDataURL(file);
                                  }
                          }} />
                      </label>
                      <button onClick={() => setGameState('NEXUS')} className="w-12 h-12 bg-red-500/80 rounded-full flex items-center justify-center border border-white/50 pointer-events-auto font-black text-white backdrop-blur-md">✕</button>
                  </div>
                </>
              ) : (
                  <img src={scanPreview} className="w-full h-full object-contain" alt="Preview" />
              )}
              {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30 backdrop-blur-md">
                      <div className="text-green-400 font-black text-4xl animate-pulse mb-6 font-['Bangers']">GEMINI AI PROCESSING</div>
                      <div className="mt-4 font-mono text-green-300 text-xs">Extracting Core Matrix...</div>
                  </div>
              )}
          </div>
          {scanPreview && !isAnalyzing && (
              <div className="p-6 bg-black flex gap-4 safe-bottom border-t border-gray-800">
                  <button onClick={handleScan} className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold border border-white/20 shadow-[0_0_20px_green]">MATERIALIZE</button>
              </div>
          )}
      </div>
      )}

      {/* --- START --- */}
      {gameState === 'SPLASH' && (
      <div className="w-full h-screen flex flex-col items-center justify-center relative bg-gradient-to-br from-yellow-300 to-orange-400 p-4">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dot-grid.png')] opacity-20"></div>
          <div className="text-6xl font-['Bangers'] mb-8 text-white drop-shadow-[4px_4px_0_#000]">PIXUPET</div>
          <div className="flex flex-col gap-4 z-20 w-full max-w-xs">
              {inventory.length > 0 && <button onClick={() => setGameState('NEXUS')} className="bg-green-500 text-white text-xl py-4 rounded-2xl font-black shadow-lg border-b-4 border-green-700">RESUME</button>}
              <button onClick={handleNewGame} className="bg-blue-500 text-white py-4 rounded-2xl font-black shadow-lg border-b-4 border-blue-700">{inventory.length > 0 ? "RESET DATA" : "NEW GAME"}</button>
          </div>
      </div>
      )}
    </div>
  );
}
