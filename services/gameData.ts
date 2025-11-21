
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';

// NEW STAGE NAMES: Casual Gamer Lingo
export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend';

export const EVO_THRESHOLDS = {
    PRO: 10,
    ELITE: 25,
    LEGEND: 50
};

export interface GameItem {
    id: string;
    name: string;
    type: 'Consumable' | 'Material' | 'Key' | 'Food' | 'Mod';
    description: string;
    effect?: (pet: any) => any;
    icon: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    price: number;
    value?: number; 
}

export interface OfflineReport {
    secondsAway: number;
    xpGained: number;
    coinsFound: number;
    hungerLost: number;
    hpLost: number;
    events: string[];
}

// --- STARTER PACKS (PROCEDURAL DUMMY PETS) ---
export const STARTER_PACKS = [
    {
        id: 'starter_fire',
        name: 'Pyro Bit',
        element: 'Fire',
        description: 'A fiery glitch in the system. Loves to burn CPU cycles.',
        stats: { hp: 80, atk: 15, def: 8, spd: 12 },
        visual_design: 'Small flame spirit, voxel ember particles, glowing red core.',
        bodyType: 'BIPED'
    },
    {
        id: 'starter_water',
        name: 'Aqua Byte',
        element: 'Water',
        description: 'Fluid data stream. Cool under pressure.',
        stats: { hp: 100, atk: 10, def: 10, spd: 10 },
        visual_design: 'Blue droplet shape, floating bubbles, liquid texture.',
        bodyType: 'FLOATING'
    },
    {
        id: 'starter_grass',
        name: 'Terra Pixel',
        element: 'Grass',
        description: 'Rooted in the mainframe. High defense capabilities.',
        stats: { hp: 120, atk: 8, def: 15, spd: 6 },
        visual_design: 'Blocky moss creature, flower on head, sturdy legs.',
        bodyType: 'QUADRUPED'
    }
];

export const calculateOfflineProgress = (pet: any, lastSeen: number): OfflineReport => {
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastSeen) / 1000);
    
    const hungerDropRate = 10 / 3600; 
    const xpRate = 50 / 3600;
    
    const totalHungerLost = Math.floor(diffSeconds * hungerDropRate);
    let remainingHunger = pet.hunger - totalHungerLost;
    
    let xpGained = 0;
    let coinsFound = 0;
    let hpLost = 0;
    let events: string[] = [];

    if (remainingHunger > 0) {
        xpGained = Math.floor(diffSeconds * xpRate);
        coinsFound = Math.floor(diffSeconds * (10/3600)); 
        pet.hunger = Math.max(0, remainingHunger);
        events.push(`AFK Farming: ${(diffSeconds/60).toFixed(0)} mins.`);
    } else {
        const safeTime = pet.hunger / hungerDropRate;
        const starvingTime = diffSeconds - safeTime;
        
        xpGained = Math.floor(safeTime * xpRate);
        pet.hunger = 0;
        
        hpLost = Math.floor(starvingTime * (5/3600));
        pet.currentHp = Math.max(0, pet.currentHp - hpLost);
        
        events.push("AFK failed. Ran out of snacks.");
        if (pet.currentHp === 0) events.push("Passed out. GG.");
    }

    return {
        secondsAway: diffSeconds,
        xpGained,
        coinsFound,
        hungerLost: totalHungerLost,
        hpLost,
        events
    };
};

// --- EVOLUTION PATH LOGIC (THE BUILD CHECK) ---
export const determineEvolutionPath = (stats: {atk: number, def: number, spd: number, happiness: number}) => {
    const { atk, def, spd, happiness } = stats;
    
    // 1. Determine Dominant Build
    let dominant = 'BALANCED';
    let protocolName = 'Basic Build';
    let color = 'text-gray-500';
    let borderColor = 'border-gray-500';
    let icon = '😐';
    let desc = "Noob stats. Grind more.";
    
    if (atk >= def && atk >= spd) {
        dominant = 'ATTACK';
        protocolName = 'DPS Build'; // High Damage
        color = 'text-red-500';
        borderColor = 'border-red-500';
        icon = '⚔️';
        desc = "Next Rank: GLASS CANNON (Full Damage)";
    } else if (def > atk && def > spd) {
        dominant = 'DEFENSE';
        protocolName = 'Tank Build'; // High Def
        color = 'text-blue-500';
        borderColor = 'border-blue-500';
        icon = '🛡️';
        desc = "Next Rank: THE WALL (Unkillable)";
    } else if (spd > atk && spd > def) {
        dominant = 'SPEED';
        protocolName = 'Speedrun Build'; // High Speed
        color = 'text-yellow-500';
        borderColor = 'border-yellow-500';
        icon = '👟';
        desc = "Next Rank: SPEEDSTER (Dodge Everything)";
    }
    
    // 2. Determine Alignment
    let alignment = 'NEUTRAL';
    if (happiness >= 85) alignment = 'LUMINOUS'; // Good Vibes
    if (happiness <= 25) alignment = 'CORRUPTED'; // Toxic Vibes

    return { dominant, alignment, protocolName, color, borderColor, icon, desc };
};

// --- PROCEDURAL ART GENERATOR ---
export const getProceduralMonsterArt = (name: string, element: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hexMap: any = {
        Fire: '#FCA5A5', Water: '#93C5FD', Grass: '#86EFAC', Electric: '#FDE047',
        Psychic: '#D8B4FE', Metal: '#D1D5DB', Dark: '#4B5563', Light: '#FEF9C3',
        Spirit: '#A5B4FC', Toxic: '#BEF264'
    };
    const baseHex = hexMap[element] || '#CBD5E1';

    // Generate a pattern of pixel blocks
    const blocks = [];
    for(let i=0; i<8; i++) {
         for(let j=0; j<8; j++) {
             if (Math.abs(Math.sin(hash * i * j)) > 0.5) {
                 blocks.push(`<rect x="${20 + i*8}" y="${40 + j*8}" width="8" height="8" fill="rgba(0,0,0,0.2)" />`);
             }
         }
    }

    const svg = `
    <svg width="200" height="200" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${baseHex}" />
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="white" stroke-width="2" stroke-dasharray="5,5" />
        ${blocks.join('')}
        <text x="50" y="85" font-family="monospace" font-weight="bold" font-size="10" text-anchor="middle" fill="black">${element.toUpperCase()} TYPE</text>
        <text x="50" y="30" font-family="monospace" font-weight="bold" font-size="12" text-anchor="middle" fill="black">${name.substring(0,8)}</text>
    </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};


export const ELEMENT_THEMES: any = {
  Fire: { bg: 'bg-red-400', text: 'text-white', icon: '🔥' },
  Water: { bg: 'bg-blue-400', text: 'text-white', icon: '💧' },
  Grass: { bg: 'bg-green-400', text: 'text-black', icon: '🌿' },
  Electric: { bg: 'bg-yellow-300', text: 'text-black', icon: '⚡' },
  Psychic: { bg: 'bg-purple-400', text: 'text-white', icon: '🔮' },
  Metal: { bg: 'bg-gray-300', text: 'text-black', icon: '⚙️' },
  Dark: { bg: 'bg-gray-800', text: 'text-white', icon: '🌑' },
  Light: { bg: 'bg-yellow-100', text: 'text-black', icon: '✨' },
  Spirit: { bg: 'bg-indigo-400', text: 'text-white', icon: '👻' },
  Toxic: { bg: 'bg-lime-400', text: 'text-black', icon: '☣️' },
};

export const ITEMS_DB: Record<string, GameItem> = {
    'pixel_pizza': {
        id: 'pixel_pizza', name: 'Cheat Code Pizza', type: 'Food',
        description: 'Restaores hunger instantly. Devs favorite.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 40); pet.happiness = Math.min(100, (pet.happiness || 50) + 5); return pet; },
        icon: '🍕', rarity: 'Common', price: 30
    },
    'data_burger': {
        id: 'data_burger', name: 'RAM Burger', type: 'Food',
        description: 'Greasy memory optimization. +60 Energy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 60); pet.happiness = Math.min(100, (pet.happiness || 50) + 10); return pet; },
        icon: '🍔', rarity: 'Common', price: 60
    },
    'glitch_candy': {
        id: 'glitch_candy', name: 'Rare Candy (Legal)', type: 'Food',
        description: 'Tastes like static. Boosts mood significantly.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 10); pet.happiness = Math.min(100, (pet.happiness || 50) + 20); return pet; },
        icon: '🍬', rarity: 'Rare', price: 80
    },
    'neon_soda': {
        id: 'neon_soda', name: 'Overclock Soda', type: 'Food',
        description: 'Warning: May cause jittery pixels. +Energy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 20); pet.happiness += 5; return pet; },
        icon: '🥤', rarity: 'Common', price: 40
    },
    
    // CONSUMABLES
    'potion_small': {
        id: 'potion_small', name: 'Debug Patch v1', type: 'Consumable',
        description: 'Fixes minor health bugs. +20 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 20); return pet; },
        icon: '🧪', rarity: 'Common', price: 50
    },
    'potion_super': {
        id: 'potion_super', name: 'System Restore', type: 'Consumable',
        description: 'Rolls back health to safe state. +60 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 60); return pet; },
        icon: '💉', rarity: 'Rare', price: 150
    },
    'revive_chip': {
        id: 'revive_chip', name: '1-UP Chip', type: 'Consumable',
        description: 'Continue? (Y/N). Revives pet.',
        effect: (pet: any) => { if(pet.currentHp <= 0) pet.currentHp = Math.floor(pet.maxHp * 0.5); return pet; },
        icon: '🕹️', rarity: 'Epic', price: 500
    },
    'energy_drink': {
        id: 'energy_drink', name: 'AFK Potion', type: 'Consumable',
        description: 'Reduces system fatigue. -50 Fatigue.',
        effect: (pet: any) => { pet.fatigue = Math.max(0, pet.fatigue - 50); return pet; },
        icon: '⚡', rarity: 'Common', price: 100
    },
    'mystery_box': {
        id: 'mystery_box', name: 'Lootbox [RNG]', type: 'Consumable',
        description: 'Gambling is fun! (Contains random items).',
        effect: (pet: any) => { return pet; }, // Logic handled in app
        icon: '📦', rarity: 'Epic', price: 500
    },

    // MODS (Formerly Drivers)
    'driver_crimson': {
        id: 'driver_crimson', name: 'Mod: VIOLENCE', type: 'Mod',
        description: 'Install Aggressive Drivers. +5 ATK.',
        effect: (pet: any) => { pet.atk += 5; return pet; },
        icon: '⚔️', rarity: 'Rare', price: 1200
    },
    'driver_titanium': {
        id: 'driver_titanium', name: 'Mod: FIREWALL', type: 'Mod',
        description: 'Install Security Patch. +5 DEF.',
        effect: (pet: any) => { pet.def += 5; return pet; },
        icon: '🛡️', rarity: 'Rare', price: 1200
    },
    'driver_azure': {
        id: 'driver_azure', name: 'Mod: TURBO', type: 'Mod',
        description: 'Install Overclock. +5 SPD.',
        effect: (pet: any) => { pet.spd += 5; return pet; },
        icon: '👟', rarity: 'Rare', price: 1200
    }
};

const ENEMY_PREFIXES: Record<string, string[]> = {
    Fire: ["Overheated", "Flaming", "Thermal", "Blazing", "Spicy"],
    Water: ["Liquid", "Damp", "Hydrated", "Fluid", "Deep"],
    Grass: ["Rooted", "Wild", "Overgrown", "Mossy", "Eco"],
    Electric: ["High-Voltage", "Glitchy", "Static", "Wired", "Shocking"],
    Metal: ["Hardened", "Heavy", "Metallic", "Shiny", "Solid"],
    Psychic: ["Wireless", "BigBrain", "Telepathic", "Zen", "Cosmic"],
    Dark: ["Corrupted", "Shadow", "Dark", "Void", "Null"],
    Light: ["Bright", "Luminous", "Flashy", "Holy", "Neon"],
    Toxic: ["Infected", "Radioactive", "Hazardous", "Gross", "Slimy"],
    Spirit: ["Ethereal", "Ghostly", "Phased", "Spectral", "Hollow"]
};

const ENEMY_SUFFIXES = ["Unit", "Bot", "Droid", "Glitch", "Main", "V1", "Daemon", "Sprite", "Pixel", "Mesh"];

const getEnemyName = (element: string) => {
    const prefixes = ENEMY_PREFIXES[element] || ["Random"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = ENEMY_SUFFIXES[Math.floor(Math.random() * ENEMY_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
}

export const getRandomEnemy = (rank: string, playerLevel: number): any => {
    const elements = Object.keys(ELEMENT_THEMES);
    const element = elements[Math.floor(Math.random() * elements.length)];
    const types: BodyType[] = ['BIPED', 'QUADRUPED', 'FLOATING', 'WHEELED'];
    const bodyType = types[Math.floor(Math.random() * types.length)];
    const name = getEnemyName(element);
    
    // Scaling difficulty slightly
    const levelVariance = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
    const level = Math.max(1, playerLevel + levelVariance); 

    // Generate procedural art immediately
    const art = getProceduralMonsterArt(name, element);

    return {
        id: `wild_${Date.now()}`,
        name: name,
        element,
        rarity: 'Common',
        stage: 'Noob', // Wild ones are mostly Noob/Rookie
        rank: 'E',
        nature: 'Wild',
        personality: 'Aggressive',
        visual_design: `A wild ${name}.`,
        potential: 1,
        hp: 60 + level * 10,
        maxHp: 60 + level * 10,
        atk: 10 + level * 2,
        def: 10 + level * 2,
        spd: 10 + level * 2,
        int: 10,
        level: level,
        exp: 20 * level,
        description: `A wild ${name} looking for a fight.`,
        ability: "Lag Switch",
        moves: [],
        bodyType,
        tactic: 'AGGRESSIVE',
        cardArtUrl: art 
    };
};

export const getLootDrop = (rank: string): string | null => {
    const rand = Math.random();
    
    // Mods (10% chance - The core grinding goal)
    if (rand > 0.90) return 'driver_crimson';
    if (rand > 0.85) return 'driver_titanium';
    if (rand > 0.80) return 'driver_azure';

    // High Value (5%)
    if (rand > 0.78) return 'revive_chip';
    if (rand > 0.75) return 'mystery_box';

    // Mid Tier (25%)
    if (rand > 0.50) return 'potion_super';
    if (rand > 0.40) return 'energy_drink';
    
    // Common (40%)
    if (rand > 0.20) return 'data_burger';
    if (rand > 0.05) return 'pixel_pizza';
    
    // 5% chance of nothing
    return null;
};
