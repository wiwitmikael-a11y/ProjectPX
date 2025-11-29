/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeObject, getGenericVoxel, generateProceduralBoss, generateBattleCommentary, generatePetReaction, generateMission, analyzeArtifact } from './services/gemini';
import { ITEMS_DB, getRandomEnemy, getLootDrop, GameItem, ELEMENT_THEMES, LOCATIONS_DB, generateStarterOptions, getActionFromText, MONSTER_DB, PARTS_DB, calculateStats, GACHA_POOLS, ActiveMission } from './services/gameData';
import { IconBag, IconCards, IconCart, IconCoin, IconMap, IconScan, IconTreasure, ItemIcon, IconCapsule, IconWrench } from './components/Icons';
import { VoxelViewer, PixuCard } from './components/Shared';

// --- TYPES ---
type GameState = 'SPLASH' | 'STARTER_SELECT' | 'NEXUS' | 'SCAN' | 'ENGINEER';
// Sub-modals are handled via separate state to prevent losing the 3D context
type ActiveModal = 'NONE' | 'SHOP' | 'COLLECTION' | 'ITEMS' | 'EXPLORE' | 'GACHA' | 'STATS';

const SAVE_VERSION = 'v32.0_STABLE'; 

// --- MAIN APP ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('SPLASH');
  const [activeModal, setActiveModal] = useState<ActiveModal>('NONE');
  
  const [user, setUser] = useState<any>({ 
      name: 'Tamer', level: 1, exp: 0, coins: 200, currentLocation: 'loc_starter', joinedAt: Date.now(), inventory: [], currentRank: 'Noob', seen: [], caught: [], kills: 0 
  });
  const [inventory, setInventory] = useState<any[]>([]);
  const [activePetIndex, setActivePetIndex] = useState<number>(0);
  const [starterOptions, setStarterOptions] = useState<any[]>([]);
  
  // Systems
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("System Online");
  const [notifs, setNotifs] = useState<{id:number, text:string, color:string}[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  
  // AFK & Combat
  const [isAutoMode, setIsAutoMode] = useState(false); 
  const [isSummoningBoss, setIsSummoningBoss] = useState(false); 
  const [missionLoading, setMissionLoading] = useState(false);

  // Gacha
  const [gachaState, setGachaState] = useState<'IDLE' | 'DROPPING' | 'REVEAL'>('IDLE');
  const [gachaResult, setGachaResult] = useState<any>(null);

  // Engineer
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Interaction
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePet = inventory[activePetIndex];
  const location = LOCATIONS_DB[user.currentLocation];

  // Fix Flicker: Memoize environment data so it doesn't re-trigger renderer on every state update
  const envData = useMemo(() => ({ 
      envType: location?.environmentType || 'Grass', 
      isNight: false 
  }), [location?.environmentType]);

  // --- INIT & SAVE ---
  useEffect(() => {
      setStarterOptions(generateStarterOptions());
      const saved = localStorage.getItem(`pixupet_save_${SAVE_VERSION}`);
      if (saved) {
          const data = JSON.parse(saved);
          setUser(data.user);
          setInventory(data.inventory);
          setGameState('NEXUS');
      }
  }, []);

  useEffect(() => {
      if (user.level > 0 && inventory.length > 0) {
        localStorage.setItem(`pixupet_save_${SAVE_VERSION}`, JSON.stringify({ user, inventory }));
      }
  }, [user, inventory]);

  // --- AUTO LOOP (AFK ENGINE) ---
  useEffect(() => {
      if (!isAutoMode || gameState !== 'NEXUS' || !activePet || isSummoningBoss) return;

      const autoLoop = setInterval(async () => {
          const currentPet = inventory[activePetIndex];
          
          // 1. Auto Sustain
          if (currentPet.hunger < 40) {
              const foodId = user.inventory.find((id: string) => ITEMS_DB[id]?.type === 'Food');
              if (foodId) { consumeItem(foodId); addLog(`AUTO: Ate ${ITEMS_DB[foodId].name}`); return; }
          }
          if (currentPet.currentHp < (currentPet.maxHp * 0.4)) {
               const potId = user.inventory.find((id: string) => ITEMS_DB[id]?.type === 'Potion' || ITEMS_DB[id]?.type === 'Consumable');
               if (potId) { consumeItem(potId); addLog(`AUTO: Healed`); return; }
          }

          // 2. Boss Check
          if ((user.kills || 0) > 0 && (user.kills || 0) % 15 === 0) {
              clearInterval(autoLoop);
              triggerBossEvent();
              return; 
          }

          // 3. Grinding
          setStatusText("AUTO_COMBAT");
          const enemy = getRandomEnemy(user.currentLocation, currentPet.level, getGenericVoxel);
          
          addExp(enemy.level * 50, true);
          addCoins(enemy.level * 25, true);
          setUser((u: any) => ({ ...u, kills: (u.kills || 0) + 1 }));
          
          // Loot
          if(Math.random() > 0.6) {
               const loot = getLootDrop(user.currentLocation);
               addItem(loot, true);
               addLog(`Killed ${enemy.name} [+${ITEMS_DB[loot]?.name || 'Item'}]`);
          } else {
               addLog(`Killed ${enemy.name}`);
          }
          
          // 3D Visual Trigger
          const iframe = document.querySelector('iframe');
          if(iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'SET_ACTION', value: 'ATTACK' }, '*');

      }, 3000); // 3 Second Tick

      return () => clearInterval(autoLoop);
  }, [isAutoMode, gameState, inventory, activePetIndex, user.kills, isSummoningBoss]);

  const triggerBossEvent = async () => {
      setIsSummoningBoss(true);
      setStatusText("BOSS ALERT");
      addLog("WARNING: BOSS DETECTED");
      
      const bossData = await generateProceduralBoss(LOCATIONS_DB[user.currentLocation].name, user.level);
      
      if (bossData) {
          const bossName = bossData.name || "Unknown Titan";
          const narrative = await generateBattleCommentary(activePet.name, bossName, location.name);
          
          addExp(user.level * 200, true);
          addCoins(500, true);
          addItem('part_halo', true);
          addLog(`BOSS DEFEATED: ${bossName}`);
          addLog(`"${narrative}"`);
          setUser((u: any) => ({ ...u, kills: (u.kills || 0) + 1 }));
          
          const iframe = document.querySelector('iframe');
          if(iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'SET_ACTION', value: 'ATTACK' }, '*');
      }
      setTimeout(() => setIsSummoningBoss(false), 4000);
  };

  // --- ACTIONS ---

  const handleNewGame = () => {
      localStorage.removeItem(`pixupet_save_${SAVE_VERSION}`);
      setUser({ name: 'Tamer', level: 1, exp: 0, coins: 500, currentLocation: 'loc_starter', joinedAt: Date.now(), inventory: ['part_leg_basic', 'part_arm_stubby'], kills: 0 });
      setInventory([]);
      setStarterOptions(generateStarterOptions());
      setGameState('STARTER_SELECT');
  };

  const consumeItem = async (itemId: string) => {
      if (itemId === 'unidentified_artifact') {
          showFloatingText("ANALYZING...", "text-blue-500");
          await analyzeArtifact(user.level); // Mock delay
          addCoins(1000, true);
          removeItem(itemId);
          showFloatingText("ARTIFACT SOLD", "text-purple-400");
          return;
      }
      const item = ITEMS_DB[itemId];
      if(!item) return;
      removeItem(itemId);
      
      const updated = [...inventory];
      const p = updated[activePetIndex];
      if(item.effect?.stat === 'hp') p.currentHp = Math.min(p.maxHp, p.currentHp + item.effect.val);
      if(item.effect?.stat === 'hunger') p.hunger = Math.min(100, p.hunger + item.effect.val);
      if(itemId === 'nano_repair_kit') { p.currentHp = p.maxHp; p.fatigue = 0; }
      setInventory(updated);
      showFloatingText("Used " + item.name, "text-green-400");
  };

  const removeItem = (itemId: string) => {
      const inv = [...user.inventory];
      const idx = inv.indexOf(itemId);
      if(idx > -1) inv.splice(idx, 1);
      setUser((u:any) => ({ ...u, inventory: inv }));
  };

  const addItem = (itemId: string, silent: boolean = false) => {
      setUser((u: any) => ({ ...u, inventory: [...u.inventory, itemId] }));
      if (!silent) showFloatingText(`Got ${ITEMS_DB[itemId]?.name || PARTS_DB[itemId]?.name}!`, 'text-green-400');
  };

  const addExp = (amount: number, silent: boolean = false) => {
      const updated = [...inventory];
      const pet = updated[activePetIndex];
      pet.exp += amount;
      if (!silent) showFloatingText(`+${amount} XP`, 'text-yellow-400');
      if (pet.exp >= pet.maxExp) {
          pet.level++; pet.exp = 0; pet.maxExp = Math.floor(pet.maxExp * 1.4);
          pet.maxHp += 20; pet.currentHp = pet.maxHp;
          pet.atk += 5; pet.def += 5;
          showFloatingText("LEVEL UP!", "text-white");
      }
      setInventory(updated);
  };

  const addCoins = (amt: number, silent: boolean = false) => {
      setUser((u:any) => ({ ...u, coins: u.coins + amt }));
      if (!silent) showFloatingText(`+${amt} G`, 'text-yellow-300');
  };

  const addLog = (msg: string) => {
      setSystemLogs(prev => [`> ${msg}`, ...prev].slice(0, 8));
  };

  const showFloatingText = (text: string, color: string) => {
      const id = Date.now() + Math.random();
      setNotifs(prev => [...prev, { id, text, color }]);
      setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 2000);
  };

  const handleScan = async () => {
      if (!scanPreview) return;
      setIsAnalyzing(true);
      try {
          const traits = await analyzeObject(scanPreview);
          if(!traits) throw new Error("AI Failed");
          
          if(!traits.hp) traits.hp = 100;
          const voxelCode = getGenericVoxel(traits.element, traits.bodyType, 'Noob', traits.visualTraits, traits.name);

          const newPet: any = {
              id: `pet_${Date.now()}`, dateCreated: Date.now(), ...traits,
              voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 80, fatigue: 0, happiness: 80,
              stage: 'Noob', rank: 'Common', currentHp: traits.hp, maxHp: traits.hp,
              parts: [], imageSource: scanPreview
          };
          setInventory([...inventory, newPet]);
          setActivePetIndex(inventory.length); 
          addItem('part_leg_basic', true);
          
          setIsAnalyzing(false); setScanPreview(null); setGameState('NEXUS');
          showFloatingText("CREATION SUCCESS", "text-green-400");

      } catch (e) { setIsAnalyzing(false); alert("Scan failed. Try again."); }
  };

  const handleStarterSelect = (starter: any) => {
      const voxelCode = getGenericVoxel(starter.element, starter.bodyType, 'Noob', starter.visualTraits, starter.name);
      const newPet: any = {
          id: `starter_${Date.now()}`, dateCreated: Date.now(), name: starter.name, element: starter.element,
          description: starter.description, bodyType: starter.bodyType, visualTraits: starter.visualTraits,
          hp: starter.stats.hp, maxHp: starter.stats.hp, currentHp: starter.stats.hp,
          atk: starter.stats.atk, def: starter.stats.def, spd: starter.stats.spd,
          voxelCode, level: 1, exp: 0, maxExp: 100, hunger: 100, fatigue: 0, happiness: 100,
          stage: 'Noob', rank: 'Starter', parts: []
      };
      setInventory([newPet]); setActivePetIndex(0);
      setGameState('NEXUS');
  };

  const handleGachaPull = async (poolType: 'STANDARD' | 'PREMIUM' | 'GOD_MODE') => {
      const poolData = GACHA_POOLS[poolType];
      if(user.coins < poolData.cost) { showFloatingText("NOT ENOUGH COINS", "text-red-500"); return; }
      addCoins(-poolData.cost, true);
      setGachaState('DROPPING');
      await new Promise(r => setTimeout(r, 1000));
      setGachaState('REVEAL');
      const itemId = poolData.pool[Math.floor(Math.random() * poolData.pool.length)];
      setGachaResult(ITEMS_DB[itemId] || PARTS_DB[itemId]);
      addItem(itemId, true);
  };

  // --- RENDERERS ---

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden font-sans select-none text-black">
      
      {/* LAYER 0: 3D WORLD (Always rendered in Nexus/Engineer to maintain context) */}
      {(gameState === 'NEXUS' || gameState === 'ENGINEER') && activePet && (
          <div className="absolute inset-0 z-0">
             <VoxelViewer 
                code={activePet.voxelCode} 
                mode={gameState === 'ENGINEER' ? 'ENGINEER' : 'HABITAT'}
                action={isAutoMode ? (statusText.includes('COMBAT') || statusText.includes('BOSS') ? 'ATTACK' : 'RUN') : getActionFromText(statusText)} 
                envData={envData}
                equipment={{ parts: activePet.parts }}
             />
          </div>
      )}

      {/* LAYER 1: HUD & OVERLAYS */}
      
      {/* TOP BAR */}
      {gameState === 'NEXUS' && activeModal === 'NONE' && (
          <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-between items-start pointer-events-none safe-top">
              {/* Pet Status */}
              <div className="bg-white/90 border-2 border-black rounded-xl p-2 pointer-events-auto cursor-pointer shadow-lg" onClick={()=>setActiveModal('STATS')}>
                  <div className="text-xs font-black uppercase flex items-center gap-1">
                      <span className="bg-black text-white px-1 rounded">LV.{activePet?.level}</span> {activePet?.name}
                  </div>
                  <div className="w-32 h-2 bg-black/20 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-pink-500 transition-all" style={{width: `${(activePet?.currentHp / activePet?.maxHp)*100}%`}}></div>
                  </div>
              </div>

              {/* Resources & Auto */}
              <div className="flex flex-col items-end pointer-events-auto gap-2">
                  <div className="bg-yellow-400 border-2 border-black px-3 py-1 rounded-full font-black text-sm shadow-md flex items-center gap-1">
                      <IconCoin /> {user.coins}
                  </div>
                  <button onClick={() => setIsAutoMode(!isAutoMode)} 
                      className={`px-4 py-2 font-black text-xs rounded-lg border-2 shadow-xl transition-all ${isAutoMode ? 'bg-red-600 border-red-800 text-white animate-pulse' : 'bg-gray-800 text-white border-black'}`}>
                      {isAutoMode ? 'AUTO: ON' : 'AUTO: OFF'}
                  </button>
              </div>
          </div>
      )}

      {/* SYSTEM LOG (AUTO MODE) */}
      {gameState === 'NEXUS' && isAutoMode && activeModal === 'NONE' && (
          <div className="absolute top-24 left-2 z-10 pointer-events-none">
              <div className="bg-black/70 p-2 rounded border-l-4 border-green-500 text-[10px] font-mono text-green-400 w-48 backdrop-blur-sm">
                  <div className="font-bold mb-1 opacity-50">SYSTEM LOG // KILLS: {user.kills}</div>
                  <div className="flex flex-col gap-0.5">
                      {systemLogs.map((log, i) => <div key={i} className="truncate">{log}</div>)}
                  </div>
              </div>
          </div>
      )}

      {/* BOSS WARNING */}
      {isSummoningBoss && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none">
               <div className="text-red-500 font-black text-5xl animate-pulse text-center font-['Bangers'] drop-shadow-[0_0_20px_red]">
                   BOSS DETECTED
               </div>
          </div>
      )}

      {/* BOTTOM NAV BAR */}
      {gameState === 'NEXUS' && activeModal === 'NONE' && !isAutoMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-end gap-3 safe-bottom pointer-events-auto">
              <NavBtn icon={<IconCards/>} label="Cards" onClick={()=>setActiveModal('COLLECTION')} />
              <NavBtn icon={<IconWrench/>} label="Build" onClick={()=>setGameState('ENGINEER')} />
              <NavBtn icon={<IconBag/>} label="Bag" onClick={()=>setActiveModal('ITEMS')} />
              
              <div className="relative -top-4">
                  <button onClick={()=>setGameState('SCAN')} className="bg-yellow-400 w-16 h-16 rounded-full border-4 border-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                      <div className="scale-125"><IconScan /></div>
                  </button>
              </div>

              <NavBtn icon={<IconCapsule/>} label="Gacha" onClick={()=>setActiveModal('GACHA')} />
              <NavBtn icon={<IconMap/>} label="Map" onClick={()=>setActiveModal('EXPLORE')} />
              <NavBtn icon={<IconCart/>} label="Shop" onClick={()=>setActiveModal('SHOP')} />
          </div>
      )}

      {/* --- MODALS (Z-50) --- */}

      {/* SHOP */}
      {activeModal === 'SHOP' && (
          <Modal title="ITEM SHOP" color="bg-purple-600" onClose={()=>setActiveModal('NONE')}>
              <div className="grid grid-cols-2 gap-3 p-4">
                  {Object.values(ITEMS_DB).filter(i => i.price > 0).map(item => (
                      <ShopCard key={item.id} item={item} canAfford={user.coins >= item.price} onBuy={() => {
                          if(user.coins >= item.price) { addCoins(-item.price, true); addItem(item.id, true); }
                      }} />
                  ))}
              </div>
          </Modal>
      )}

      {/* COLLECTION */}
      {activeModal === 'COLLECTION' && (
          <Modal title="PET CARDS" color="bg-blue-600" onClose={()=>setActiveModal('NONE')}>
              <div className="grid grid-cols-2 gap-3 p-4">
                  {inventory.map((pet, idx) => (
                      <div key={pet.id} onClick={() => { setActivePetIndex(idx); setActiveModal('NONE'); }} 
                           className={`border-4 rounded-xl overflow-hidden cursor-pointer ${idx===activePetIndex?'border-green-500 ring-2 ring-green-300':'border-transparent'}`}>
                           <PixuCard pet={pet} />
                      </div>
                  ))}
              </div>
          </Modal>
      )}

      {/* INVENTORY */}
      {activeModal === 'ITEMS' && (
          <Modal title="INVENTORY" color="bg-orange-500" onClose={()=>setActiveModal('NONE')}>
              <div className="grid grid-cols-4 gap-2 p-4">
                  {user.inventory.map((itemId: string, idx: number) => (
                      <div key={idx} onClick={() => { if(['Food','Potion','Consumable','Artifact'].includes(ITEMS_DB[itemId]?.type)) consumeItem(itemId); }} 
                           className="aspect-square bg-white border-2 border-black rounded-lg flex items-center justify-center relative active:scale-90 transition-transform">
                          {ITEMS_DB[itemId] ? <div className="w-8 h-8"><ItemIcon item={ITEMS_DB[itemId]}/></div> : <span className="text-[8px] text-center font-bold leading-none">{PARTS_DB[itemId]?.name}</span>}
                          {itemId === 'unidentified_artifact' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-xs">?</div>}
                      </div>
                  ))}
                  {user.inventory.length === 0 && <div className="col-span-4 text-center text-gray-400 py-10 font-bold">Empty Bag</div>}
              </div>
          </Modal>
      )}

      {/* MAP */}
      {activeModal === 'EXPLORE' && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col">
              <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-white font-black text-xl"><IconMap/> WORLD MAP</h2>
                  <button onClick={()=>setActiveModal('NONE')} className="bg-red-500 text-white px-4 py-1 rounded font-bold border-2 border-white">CLOSE</button>
              </div>
              <div className="flex-1 relative overflow-auto bg-[#0f172a] p-8">
                  <div className="relative w-[600px] h-[600px] mx-auto my-auto border-4 border-blue-900/30 rounded-full bg-blue-950/20">
                      {Object.values(LOCATIONS_DB).map(loc => (
                          <div key={loc.id} onClick={() => { setUser((u:any)=>({...u, currentLocation: loc.id})); setActiveModal('NONE'); }}
                              className={`absolute w-16 h-16 -ml-8 -mt-8 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform ${user.currentLocation===loc.id?'scale-110 z-20':''}`} 
                              style={{left:`${loc.x}%`, top:`${loc.y}%`}}>
                              <div className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center ${loc.color} shadow-[0_0_10px_${loc.color}] text-xl`}>
                                  {ELEMENT_THEMES[loc.enemyTheme[0]]?.icon}
                              </div>
                              <div className="mt-1 bg-black/80 text-white text-[8px] px-2 py-0.5 rounded border border-white/20 whitespace-nowrap">{loc.name}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* GACHA */}
      {activeModal === 'GACHA' && (
           <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
               <button onClick={()=>setActiveModal('NONE')} className="absolute top-4 right-4 bg-red-500 text-white px-6 py-2 rounded-full font-black border-2 border-white">EXIT</button>
               
               {gachaState === 'IDLE' && (
                   <div className="flex flex-col gap-4 w-full max-w-sm">
                       <h2 className="text-white text-3xl font-black text-center mb-4 text-pink-500">GACHA</h2>
                       <GachaBtn label="STANDARD" cost={100} desc="Common Items" color="bg-white" onClick={()=>handleGachaPull('STANDARD')} />
                       <GachaBtn label="PREMIUM" cost={500} desc="Rare Gear" color="bg-purple-200" onClick={()=>handleGachaPull('PREMIUM')} />
                       <GachaBtn label="GOD MODE" cost={2000} desc="Mythic/God ONLY" color="bg-yellow-200" onClick={()=>handleGachaPull('GOD_MODE')} />
                   </div>
               )}
               {gachaState === 'DROPPING' && <div className="text-8xl animate-bounce">💊</div>}
               {gachaState === 'REVEAL' && gachaResult && (
                   <div className="flex flex-col items-center animate-in zoom-in">
                       <div className="bg-white p-6 rounded-3xl border-4 border-yellow-400 mb-4 transform rotate-3">
                           <div className="w-24 h-24">{gachaResult.type ? <ItemIcon item={gachaResult}/> : <span className="text-2xl font-black">{gachaResult.name}</span>}</div>
                       </div>
                       <div className="text-yellow-400 text-2xl font-black">{gachaResult.name}</div>
                       <button onClick={() => setGachaState('IDLE')} className="mt-8 bg-blue-500 text-white px-8 py-3 rounded-full font-black border-4 border-blue-700">AGAIN</button>
                   </div>
               )}
           </div>
      )}

      {/* STATS MODAL */}
      {activeModal === 'STATS' && (
          <Modal title="PET STATUS" color="bg-gray-800" onClose={()=>setActiveModal('NONE')}>
              <div className="p-4 text-white">
                  <div className="text-2xl font-black mb-2">{activePet.name}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      <div className="bg-white/10 p-2 rounded">HP: {activePet.currentHp}/{activePet.maxHp}</div>
                      <div className="bg-white/10 p-2 rounded">ATK: {activePet.atk}</div>
                      <div className="bg-white/10 p-2 rounded">DEF: {activePet.def}</div>
                      <div className="bg-white/10 p-2 rounded">SPD: {activePet.spd}</div>
                      <div className="bg-white/10 p-2 rounded">HUNGER: {activePet.hunger}%</div>
                  </div>
              </div>
          </Modal>
      )}

      {/* ENGINEER MODE (Special GameState) */}
      {gameState === 'ENGINEER' && (
           <div className="absolute inset-0 z-50 pointer-events-none">
               <div className="absolute top-0 left-0 right-0 p-4 bg-blue-900/90 text-white flex justify-between items-center pointer-events-auto border-b-4 border-blue-500">
                   <div>
                       <h2 className="font-black text-xl"><IconWrench/> ENGINEER MODE</h2>
                       <div className="text-xs text-blue-300">Click pet body to attach part</div>
                   </div>
                   <button onClick={() => setGameState('NEXUS')} className="bg-red-500 px-4 py-2 rounded font-bold border-2 border-black">EXIT</button>
               </div>
               
               <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 flex gap-2 overflow-x-auto pointer-events-auto border-t-4 border-blue-500">
                   {user.inventory.filter((id:string) => PARTS_DB[id]).map((partId:string, i:number) => (
                       <button key={i} onClick={() => {
                           setSelectedPartId(partId);
                           const iframe = document.querySelector('iframe');
                           if(iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'SET_MODE', value: 'ENGINEER', partId }, '*');
                       }} 
                       className={`p-2 rounded border-2 min-w-[80px] text-xs font-bold text-center ${selectedPartId === partId ? 'bg-yellow-400 text-black border-white' : 'bg-gray-700 text-white border-gray-600'}`}>
                           {PARTS_DB[partId]?.name}
                       </button>
                   ))}
               </div>
           </div>
      )}

      {/* SPLASH & START */}
      {gameState === 'SPLASH' && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-yellow-400 bg-[url('https://www.transparenttextures.com/patterns/dot-grid.png')]">
              <h1 className="text-6xl font-black text-white drop-shadow-[4px_4px_0_#000] mb-8 font-['Bangers']">PIXUPET</h1>
              <div className="flex flex-col gap-4 w-64">
                  <button onClick={handleNewGame} className="pop-btn btn-primary text-xl">NEW GAME</button>
                  {inventory.length > 0 && <button onClick={()=>setGameState('NEXUS')} className="pop-btn btn-success text-xl">RESUME</button>}
              </div>
          </div>
      )}

      {/* STARTER SELECT */}
      {gameState === 'STARTER_SELECT' && (
          <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center p-4">
              <h2 className="text-3xl text-white font-black mb-8">CHOOSE YOUR PARTNER</h2>
              <div className="flex flex-wrap justify-center gap-4">
                  {starterOptions.map((opt, i) => (
                      <div key={i} onClick={()=>handleStarterSelect(opt)} className="bg-gray-800 p-4 rounded-xl border-4 border-gray-700 hover:border-yellow-400 cursor-pointer w-48 transition-all hover:-translate-y-2">
                          <div className="text-4xl text-center mb-2">{ELEMENT_THEMES[opt.element].icon}</div>
                          <div className="text-white font-black text-center text-xl">{opt.name}</div>
                          <div className="text-gray-400 text-xs text-center mt-2">{opt.description}</div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* SCAN SCREEN */}
      {gameState === 'SCAN' && (
           <div className="absolute inset-0 z-[100] bg-black flex flex-col">
               <div className="flex-1 relative flex items-center justify-center">
                   {!scanPreview ? (
                       <label className="bg-gray-800 text-white px-8 py-4 rounded-xl border-2 border-gray-600 cursor-pointer hover:bg-gray-700 flex flex-col items-center gap-2">
                           <IconScan/>
                           <span className="font-bold">UPLOAD IMAGE</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                               if(e.target.files?.[0]) {
                                   const r = new FileReader();
                                   r.onload = () => setScanPreview(r.result as string);
                                   r.readAsDataURL(e.target.files[0]);
                               }
                           }}/>
                       </label>
                   ) : (
                       <img src={scanPreview} className="max-h-full max-w-full object-contain" />
                   )}
                   {isAnalyzing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-green-500 font-mono animate-pulse">ANALYZING MATRIX...</div>}
               </div>
               <div className="p-4 flex gap-4 bg-gray-900">
                   <button onClick={()=>setGameState('NEXUS')} className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-bold">CANCEL</button>
                   {scanPreview && !isAnalyzing && <button onClick={handleScan} className="flex-1 bg-green-500 text-black py-3 rounded-lg font-bold">MATERIALIZE</button>}
               </div>
           </div>
      )}

      {/* FLOATING TEXT NOTIFICATIONS */}
      {notifs.map(n => (
          <div key={n.id} className={`absolute top-1/4 w-full text-center text-2xl font-black ${n.color} pointer-events-none float-down z-[200] drop-shadow-[2px_2px_0_#000]`}>
              {n.text}
          </div>
      ))}

    </div>
  );
}

// --- SUB COMPONENTS ---

const NavBtn = ({icon, label, onClick}: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-white border-2 border-black rounded-xl w-14 h-14 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all group">
        <div className="scale-75 group-hover:scale-90 transition-transform">{icon}</div>
        <span className="text-[9px] font-black uppercase mt-[-2px]">{label}</span>
    </button>
);

const Modal = ({title, color, onClose, children}: any) => (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in zoom-in duration-200">
        <div className={`w-full max-w-md bg-white rounded-2xl overflow-hidden border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.5)] flex flex-col max-h-[80vh]`}>
            <div className={`${color} p-3 flex justify-between items-center border-b-4 border-black`}>
                <h2 className="text-white font-black text-xl italic tracking-wider">{title}</h2>
                <button onClick={onClose} className="bg-white text-black px-3 py-1 rounded font-bold text-xs border-2 border-black hover:bg-gray-200">CLOSE</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100">
                {children}
            </div>
        </div>
    </div>
);

const ShopCard = ({item, canAfford, onBuy}: any) => (
    <div className="bg-white p-2 rounded-lg border-2 border-gray-200 flex flex-col items-center shadow-sm">
        <div className="w-10 h-10 mb-1"><ItemIcon item={item}/></div>
        <div className="font-bold text-xs text-center truncate w-full">{item.name}</div>
        <div className="text-[10px] text-gray-500 text-center mb-1">{item.effect ? `+${item.effect.val} ${item.effect.stat}` : item.description.slice(0,20)}</div>
        <button onClick={onBuy} disabled={!canAfford} 
            className={`w-full rounded py-1 font-black text-[10px] border border-black ${canAfford ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-300 text-gray-500'}`}>
            {item.price} G
        </button>
    </div>
);

const GachaBtn = ({label, cost, desc, color, onClick}: any) => (
    <button onClick={onClick} className={`${color} p-4 rounded-xl border-4 border-black flex justify-between items-center hover:scale-105 transition-transform shadow-[4px_4px_0_#000]`}>
        <div className="text-left">
            <div className="font-black text-lg">{label}</div>
            <div className="text-xs opacity-70 font-bold">{desc}</div>
        </div>
        <div className="bg-black text-white px-3 py-1 rounded font-black text-sm">{cost} G</div>
    </button>
);