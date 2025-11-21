
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGenericVoxel } from './gemini';

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';
export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend';

export const EVO_THRESHOLDS = {
    PRO: 10,
    ELITE: 25,
    LEGEND: 50
};

// --- ITEMS DATABASE EXPANSION ---
export interface GameItem {
    id: string; name: string; type: 'Consumable' | 'Material' | 'Key' | 'Food' | 'Gear';
    description: string; effect?: (pet: any) => any; icon: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; price: number; value?: number; 
}

export const ITEMS_DB: Record<string, GameItem> = {
    // FOOD
    'pixel_pizza': { id: 'pixel_pizza', name: 'Pixel Pizza', type: 'Food', description: '+40 Hunger.', icon: '🍕', rarity: 'Common', price: 30, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+40) }) },
    'data_burger': { id: 'data_burger', name: 'Data Burger', type: 'Food', description: '+60 Hunger.', icon: '🍔', rarity: 'Common', price: 60, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+60) }) },
    'neon_soda': { id: 'neon_soda', name: 'Neon Soda', type: 'Food', description: '+20 Hunger.', icon: '🥤', rarity: 'Common', price: 40, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+20) }) },
    'glitch_steak': { id: 'glitch_steak', name: 'Glitch Steak', type: 'Food', description: '+90 Hunger. Spicy!', icon: '🥩', rarity: 'Rare', price: 150, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+90) }) },

    // POTIONS
    'potion_small': { id: 'potion_small', name: 'Small Potion', type: 'Consumable', description: '+20 HP.', icon: '🧪', rarity: 'Common', price: 50, effect: (p)=>({ ...p, currentHp: Math.min(p.maxHp, p.currentHp+20) }) },
    'potion_super': { id: 'potion_super', name: 'Super Potion', type: 'Consumable', description: '+60 HP.', icon: '💉', rarity: 'Rare', price: 150, effect: (p)=>({ ...p, currentHp: Math.min(p.maxHp, p.currentHp+60) }) },
    'revive_chip': { id: 'revive_chip', name: 'Revive Chip', type: 'Consumable', description: 'Revive 50% HP.', icon: '❤️', rarity: 'Epic', price: 500, effect: (p)=>({ ...p, currentHp: p.currentHp<=0 ? Math.floor(p.maxHp*0.5) : p.currentHp }) },

    // ELEMENTAL CHIPS (Regional Loot)
    'chip_fire': { id: 'chip_fire', name: 'Magma Chip', type: 'Material', description: 'Warm to the touch.', icon: '🔥', rarity: 'Rare', price: 300 },
    'chip_water': { id: 'chip_water', name: 'Tidal Chip', type: 'Material', description: 'Always damp.', icon: '💧', rarity: 'Rare', price: 300 },
    'chip_grass': { id: 'chip_grass', name: 'Bloom Chip', type: 'Material', description: 'Smells like rain.', icon: '🌿', rarity: 'Rare', price: 300 },
    'chip_electric': { id: 'chip_electric', name: 'Volt Chip', type: 'Material', description: 'Zaps your finger.', icon: '⚡', rarity: 'Rare', price: 300 },
    'chip_metal': { id: 'chip_metal', name: 'Alloy Chip', type: 'Material', description: 'Heavy and cold.', icon: '🔩', rarity: 'Rare', price: 300 },
    'chip_dark': { id: 'chip_dark', name: 'Void Chip', type: 'Material', description: 'Absorbs light.', icon: '🌑', rarity: 'Epic', price: 600 },

    // STAT BOOSTERS (Vitamins)
    'vitamin_hp': { id: 'vitamin_hp', name: 'HP Up', type: 'Consumable', description: 'Perm +5 Max HP.', icon: '💊', rarity: 'Epic', price: 1000, effect: (p)=>({ ...p, maxHp: p.maxHp+5, currentHp: p.currentHp+5 }) },
    'vitamin_atk': { id: 'vitamin_atk', name: 'Protein', type: 'Consumable', description: 'Perm +1 ATK.', icon: '💪', rarity: 'Epic', price: 1000, effect: (p)=>({ ...p, atk: p.atk+1 }) },

    // GEAR
    'driver_crimson': { id: 'driver_crimson', name: 'Crimson Driver', type: 'Gear', description: '+5 ATK.', icon: '⚔️', rarity: 'Rare', price: 1200, effect: (p)=>({ ...p, atk: p.atk+5 }) },
    'driver_titanium': { id: 'driver_titanium', name: 'Titanium Driver', type: 'Gear', description: '+5 DEF.', icon: '🛡️', rarity: 'Rare', price: 1200, effect: (p)=>({ ...p, def: p.def+5 }) },
    'driver_azure': { id: 'driver_azure', name: 'Azure Driver', type: 'Gear', description: '+5 SPD.', icon: '👟', rarity: 'Rare', price: 1200, effect: (p)=>({ ...p, spd: p.spd+5 }) },
    'mystery_box': { id: 'mystery_box', name: 'Mystery Box', type: 'Consumable', description: 'Random Loot.', icon: '🎁', rarity: 'Epic', price: 500 }
};

// --- LOCATIONS SYSTEM EXPANSION ---
export interface LocationNode {
    id: string;
    name: string;
    description: string;
    levelReq: number;
    difficultyMod: number;
    lootTier: number;
    coinMod: number;
    x: number; // On the big map
    y: number; // On the big map
    connections: string[];
    color: string;
    enemyTheme: string[]; // Elements that appear here
    exclusiveLoot: string[]; // Items specific to this zone
    environmentType?: string; // Used for Voxel Visuals
}

// A 200x200 coordinate system conceptually for the scrollable map
export const LOCATIONS_DB: Record<string, LocationNode> = {
    // --- TIER 1: STARTER ---
    'loc_starter': {
        id: 'loc_starter', name: 'Green Hills', description: 'Peaceful plains for beginners.',
        levelReq: 1, difficultyMod: 1.0, lootTier: 1, coinMod: 1.0,
        x: 50, y: 90, connections: ['loc_woods', 'loc_coast'], 
        color: 'bg-green-400', enemyTheme: ['Grass', 'Light'], exclusiveLoot: ['pixel_pizza'], environmentType: 'Grass'
    },
    
    // --- TIER 2: ELEMENTAL WILDS ---
    'loc_woods': {
        id: 'loc_woods', name: 'Whispering Woods', description: 'Dense forest teeming with life.',
        levelReq: 5, difficultyMod: 1.2, lootTier: 1, coinMod: 1.1,
        x: 30, y: 80, connections: ['loc_starter', 'loc_swamp'], 
        color: 'bg-emerald-500', enemyTheme: ['Grass', 'Toxic'], exclusiveLoot: ['chip_grass'], environmentType: 'Grass'
    },
    'loc_coast': {
        id: 'loc_coast', name: 'Sapphire Coast', description: 'The tides bring treasures.',
        levelReq: 5, difficultyMod: 1.2, lootTier: 1, coinMod: 1.2,
        x: 70, y: 80, connections: ['loc_starter', 'loc_city'], 
        color: 'bg-blue-400', enemyTheme: ['Water'], exclusiveLoot: ['chip_water'], environmentType: 'Water'
    },
    'loc_caldera': {
        id: 'loc_caldera', name: 'Crimson Caldera', description: 'Extreme heat. Fire bots only.',
        levelReq: 15, difficultyMod: 1.8, lootTier: 2, coinMod: 1.5,
        x: 10, y: 60, connections: ['loc_woods', 'loc_foundry'], 
        color: 'bg-red-500', enemyTheme: ['Fire', 'Metal'], exclusiveLoot: ['chip_fire', 'driver_crimson'], environmentType: 'Fire'
    },
    'loc_peaks': {
        id: 'loc_peaks', name: 'Thunder Peaks', description: 'Stormy heights.',
        levelReq: 15, difficultyMod: 1.8, lootTier: 2, coinMod: 1.5,
        x: 90, y: 60, connections: ['loc_coast', 'loc_sanctum'], 
        color: 'bg-yellow-400', enemyTheme: ['Electric', 'Light'], exclusiveLoot: ['chip_electric', 'driver_azure'], environmentType: 'Electric'
    },

    // --- TIER 3: CIVILIZATION & INDUSTRY ---
    'loc_city': {
        id: 'loc_city', name: 'Neon Metropolis', description: 'The hub of cyber-commerce.',
        levelReq: 20, difficultyMod: 2.0, lootTier: 2, coinMod: 2.5, // HIGH GOLD
        x: 50, y: 50, connections: ['loc_coast', 'loc_foundry', 'loc_sanctum'], 
        color: 'bg-cyan-500', enemyTheme: ['Electric', 'Metal'], exclusiveLoot: ['neon_soda', 'data_burger'], environmentType: 'Metal'
    },
    'loc_foundry': {
        id: 'loc_foundry', name: 'Iron Foundry', description: 'Heavy industrial zone.',
        levelReq: 25, difficultyMod: 2.5, lootTier: 3, coinMod: 1.8,
        x: 30, y: 40, connections: ['loc_city', 'loc_caldera', 'loc_waste'], 
        color: 'bg-slate-500', enemyTheme: ['Metal', 'Fire'], exclusiveLoot: ['chip_metal', 'driver_titanium'], environmentType: 'Metal'
    },
    'loc_sanctum': {
        id: 'loc_sanctum', name: 'Mystic Sanctum', description: 'Reality bends here.',
        levelReq: 25, difficultyMod: 2.5, lootTier: 3, coinMod: 1.8,
        x: 70, y: 40, connections: ['loc_city', 'loc_peaks', 'loc_waste'], 
        color: 'bg-purple-500', enemyTheme: ['Psychic', 'Spirit'], exclusiveLoot: ['potion_super'], environmentType: 'Psychic'
    },

    // --- TIER 4: HAZARD ZONES ---
    'loc_swamp': {
        id: 'loc_swamp', name: 'Toxic Waste', description: 'Polluted data streams.',
        levelReq: 30, difficultyMod: 3.0, lootTier: 3, coinMod: 2.0,
        x: 10, y: 30, connections: ['loc_woods', 'loc_waste'], 
        color: 'bg-lime-500', enemyTheme: ['Toxic', 'Dark'], exclusiveLoot: ['revive_chip'], environmentType: 'Toxic'
    },
    'loc_waste': {
        id: 'loc_waste', name: 'Glitch Badlands', description: 'Unstable reality.',
        levelReq: 40, difficultyMod: 3.5, lootTier: 4, coinMod: 2.5,
        x: 50, y: 30, connections: ['loc_city', 'loc_foundry', 'loc_sanctum', 'loc_void'], 
        color: 'bg-pink-600', enemyTheme: ['Dark', 'Psychic'], exclusiveLoot: ['glitch_steak', 'vitamin_hp'], environmentType: 'Psychic'
    },

    // --- TIER 5: ENDGAME ---
    'loc_void': {
        id: 'loc_void', name: 'The Glitch Layer', description: 'Absolute chaos. Legends only.',
        levelReq: 50, difficultyMod: 5.0, lootTier: 5, coinMod: 5.0,
        x: 50, y: 10, connections: ['loc_waste'], 
        color: 'bg-violet-900 border-white', enemyTheme: ['Dark', 'Spirit', 'Metal', 'Fire'], exclusiveLoot: ['chip_dark', 'vitamin_atk', 'mystery_box'], environmentType: 'Dark'
    }
};

export const GAME_HINTS = [
    "Elemental Chips (Fire, Water, etc) only drop in their respective zones.",
    "Neon Metropolis is the best place to farm Gold.",
    "The Glitch Layer drops permanent stat boosting vitamins!",
    "Evolution happens at Level 10, 25, and 50.",
    "Tougher zones give significantly more XP.",
    "Matchups: Water > Fire > Grass > Water | Electric > Metal.",
];

export interface Move {
    name: string; type: string; power: number; accuracy: number; description: string;
}

export interface MonsterStats {
    id: string; dateCreated: number; name: string; element: string; rarity: string;
    stage: MonsterStage; rank: string; nature: string; personality?: string;
    visual_design: string; bodyType: BodyType; potential: number;
    hp: number; maxHp?: number; atk: number; def: number; spd: number; int: number;
    description: string; ability: string; moves: Move[]; tactic?: AITactic; happiness?: number;
}

export interface OfflineReport {
    secondsAway: number; xpGained: number; coinsFound: number;
    hungerLost: number; hpLost: number; events: string[];
}

export const STARTER_PACKS = [
    {
        id: 'starter_fire', name: 'Blaze Kid', element: 'Fire',
        description: 'Hot-headed bipedal fighter.',
        stats: { hp: 80, atk: 18, def: 8, spd: 12 },
        visual_design: 'Robot with flame vents.', bodyType: 'BIPED'
    },
    {
        id: 'starter_water', name: 'Aqua Drone', element: 'Water',
        description: 'Balanced floating drone.',
        stats: { hp: 100, atk: 10, def: 10, spd: 14 },
        visual_design: 'Sphere drone with water.', bodyType: 'FLOATING'
    },
    {
        id: 'starter_grass', name: 'Moss Pup', element: 'Grass',
        description: 'Tanky quadruped.',
        stats: { hp: 120, atk: 8, def: 18, spd: 6 },
        visual_design: 'Mossy cyber-dog.', bodyType: 'QUADRUPED'
    }
];

export const calculateOfflineProgress = (pet: any, lastSeen: number): OfflineReport => {
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastSeen) / 1000);
    const hungerDropRate = 10 / 3600; 
    const xpRate = 50 / 3600;
    const totalHungerLost = Math.floor(diffSeconds * hungerDropRate);
    let remainingHunger = pet.hunger - totalHungerLost;
    let xpGained = 0; let coinsFound = 0; let hpLost = 0; let events: string[] = [];

    if (remainingHunger > 0) {
        xpGained = Math.floor(diffSeconds * xpRate);
        coinsFound = Math.floor(diffSeconds * (10/3600)); 
        pet.hunger = Math.max(0, remainingHunger);
        events.push(`Auto-Exploring: ${(diffSeconds/60).toFixed(0)} mins.`);
    } else {
        pet.hunger = 0;
        hpLost = Math.floor((diffSeconds - (pet.hunger / hungerDropRate)) * (5/3600));
        pet.currentHp = Math.max(0, pet.currentHp - hpLost);
        events.push("Stopped exploring. Out of energy.");
    }

    return { secondsAway: diffSeconds, xpGained, coinsFound, hungerLost: totalHungerLost, hpLost, events };
};

export const determineEvolutionPath = (stats: {atk: number, def: number, spd: number, happiness: number}) => {
    const { atk, def, spd, happiness } = stats;
    let dominant = 'BALANCED'; let protocolName = 'Balanced';
    let color = 'text-gray-500'; let borderColor = 'border-gray-500';
    let icon = '😐'; let desc = "Keep grinding.";
    
    if (atk >= def && atk >= spd) { dominant = 'ATTACK'; protocolName = 'Striker'; color = 'text-red-500'; icon = '⚔️'; desc = "Path: Glass Cannon"; }
    else if (def > atk && def > spd) { dominant = 'DEFENSE'; protocolName = 'Guardian'; color = 'text-blue-500'; icon = '🛡️'; desc = "Path: Unbreakable"; }
    else if (spd > atk && spd > def) { dominant = 'SPEED'; protocolName = 'Speedster'; color = 'text-yellow-500'; icon = '👟'; desc = "Path: Mach 10"; }
    
    let alignment = 'NEUTRAL';
    if (happiness >= 85) alignment = 'LUMINOUS'; 
    if (happiness <= 25) alignment = 'CORRUPTED';

    return { dominant, alignment, protocolName, color, borderColor, icon, desc };
};

export const getProceduralMonsterArt = (name: string, element: string): string => {
    const colors: any = { Fire: '#FF6B6B', Water: '#4D96FF', Grass: '#6BCB77', Electric: '#FFD93D', Psychic: '#C77dFF', Metal: '#94A3B8', Dark: '#6D28D9', Light: '#FDE047' };
    const hex = colors[element] || '#CBD5E1';
    return `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${hex}"/><text x="50" y="50" text-anchor="middle">${element[0]}</text></svg>`)}`;
};

// NEO-POP CANDY PALETTE (AAA ROBLOX STYLE)
export const ELEMENT_THEMES: any = {
  Fire: { bg: 'bg-orange-500', text: 'text-white', icon: '🔥', hex: 0xFF6B6B },
  Water: { bg: 'bg-blue-400', text: 'text-white', icon: '💧', hex: 0x4D96FF },
  Grass: { bg: 'bg-green-500', text: 'text-white', icon: '🌿', hex: 0x6BCB77 },
  Electric: { bg: 'bg-yellow-400', text: 'text-black', icon: '⚡', hex: 0xFFD93D },
  Psychic: { bg: 'bg-purple-400', text: 'text-white', icon: '🔮', hex: 0xC77DFF },
  Metal: { bg: 'bg-slate-400', text: 'text-black', icon: '⚙️', hex: 0x94A3B8 },
  Dark: { bg: 'bg-violet-800', text: 'text-white', icon: '🌑', hex: 0x6D28D9 },
  Light: { bg: 'bg-yellow-100', text: 'text-black', icon: '✨', hex: 0xFFF176 },
  Spirit: { bg: 'bg-indigo-400', text: 'text-white', icon: '👻', hex: 0x818CF8 },
  Toxic: { bg: 'bg-lime-500', text: 'text-black', icon: '☣️', hex: 0xBEF264 },
};

// --- GENERATORS UPDATED FOR LOCATION AWARENESS ---

export const getRandomEnemy = (locationId: string, playerLevel: number, genVoxelFunc: any): any => {
    const loc = LOCATIONS_DB[locationId] || LOCATIONS_DB['loc_starter'];
    
    // Pick element based on location theme
    const themes = loc.enemyTheme || Object.keys(ELEMENT_THEMES);
    const element = themes[Math.floor(Math.random() * themes.length)];
    const bodyType: BodyType = ['BIPED', 'QUADRUPED', 'FLOATING'][Math.floor(Math.random()*3)] as BodyType;
    
    const name = `Wild ${element} Bot`;
    // Scale enemy level by Location Difficulty
    const level = Math.max(1, Math.floor(playerLevel * loc.difficultyMod)); 
    const enemyStage = level > 40 ? 'Legend' : level > 25 ? 'Elite' : level > 10 ? 'Pro' : 'Noob';
    
    return {
        id: `wild_${Date.now()}`, name, element, stage: enemyStage,
        hp: Math.floor(60 * loc.difficultyMod + level*10),
        atk: Math.floor(10 * loc.difficultyMod + level*2),
        def: Math.floor(10 * loc.difficultyMod + level*2),
        level, maxHp: Math.floor(60 * loc.difficultyMod + level*10),
        voxelCode: genVoxelFunc(element, bodyType, enemyStage)
    };
};

export const getLootDrop = (locationId: string): string | null => {
    const loc = LOCATIONS_DB[locationId] || LOCATIONS_DB['loc_starter'];
    const rand = Math.random();
    
    // 1. Check Exclusive Drops (Chips, Vitamins) - Low chance
    if (loc.exclusiveLoot && loc.exclusiveLoot.length > 0 && rand > 0.85) {
        return loc.exclusiveLoot[Math.floor(Math.random() * loc.exclusiveLoot.length)];
    }

    // 2. Generic High Tier Loot
    if (loc.lootTier >= 3 && rand > 0.9) return 'driver_crimson';
    if (loc.lootTier >= 2 && rand > 0.8) return 'potion_super';
    
    // 3. Common Loot
    if (rand > 0.6) return 'neon_soda';
    if (rand > 0.4) return 'data_burger';
    return 'pixel_pizza';
};

export const getRandomEventText = (locationId: string): string => {
    const loc = LOCATIONS_DB[locationId];
    const generic = ["Wandering...", "Scanning area...", "Calculating path...", "Admiring view..."];
    const specific: Record<string, string[]> = {
        'loc_starter': ["Chasing butterflies.", "Napping in grass.", "Rolling down hills."],
        'loc_woods': ["Heard a twig snap.", "Lost in the trees.", "Smells like moss."],
        'loc_coast': ["Splashing in waves.", "Found a seashell.", "Sand everywhere."],
        'loc_caldera': ["Systems overheating!", "Dodging lava.", "Consuming heat."],
        'loc_city': ["Browsing shops.", "Hacking terminals.", "Neon lights dazzle."],
        'loc_void': ["ERROR: REALITY BREAK.", "Darkness gazing back.", "Floating in nothing."]
    };
    
    const pool = specific[locationId] || generic;
    return pool[Math.floor(Math.random() * pool.length)];
};
