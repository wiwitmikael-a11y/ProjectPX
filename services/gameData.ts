
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGenericVoxel } from './gemini'; // Circular dependency handled by App logic usually, but here we need basic voxel gen for enemies

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';

// NEW STAGE NAMES: Casual Gamer Lingo
export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend';

export const EVO_THRESHOLDS = {
    PRO: 10,
    ELITE: 25,
    LEGEND: 50
};

export interface Move {
    name: string;
    type: string;
    power: number;
    accuracy: number;
    description: string;
}

export interface MonsterStats {
    id: string;
    dateCreated: number;
    name: string;
    element: string;
    rarity: string;
    stage: MonsterStage;
    rank: string;
    nature: string;
    personality?: string;
    visual_design: string;
    bodyType: BodyType;
    potential: number;
    hp: number;
    maxHp?: number;
    atk: number;
    def: number;
    spd: number;
    int: number;
    description: string;
    ability: string;
    moves: Move[];
    tactic?: AITactic;
    happiness?: number;
}

export interface GameItem {
    id: string;
    name: string;
    type: 'Consumable' | 'Material' | 'Key' | 'Food' | 'Gear';
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
        name: 'Ember Bot',
        element: 'Fire',
        description: 'A feisty little robot powered by a coal furnace.',
        stats: { hp: 80, atk: 15, def: 8, spd: 12 },
        visual_design: 'A small bipedal robot with a glowing red furnace chest and flame vents on shoulders. Cute but hot.',
        bodyType: 'BIPED'
    },
    {
        id: 'starter_water',
        name: 'Bubble Drone',
        element: 'Water',
        description: 'An aquatic surveillance unit that loves to splash.',
        stats: { hp: 100, atk: 10, def: 10, spd: 10 },
        visual_design: 'A round floating spherical drone with blue glass dome, small propeller on bottom, and bubble particles.',
        bodyType: 'FLOATING'
    },
    {
        id: 'starter_grass',
        name: 'Leaf Pup',
        element: 'Grass',
        description: 'Half dog, half plant. 100% good boy.',
        stats: { hp: 120, atk: 8, def: 15, spd: 6 },
        visual_design: 'A quadruped cyber-dog with mossy green armor plates and a flower blooming on its back.',
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
        events.push(`Auto-Exploring: ${(diffSeconds/60).toFixed(0)} mins.`);
    } else {
        const safeTime = pet.hunger / hungerDropRate;
        const starvingTime = diffSeconds - safeTime;
        
        xpGained = Math.floor(safeTime * xpRate);
        pet.hunger = 0;
        
        hpLost = Math.floor(starvingTime * (5/3600));
        pet.currentHp = Math.max(0, pet.currentHp - hpLost);
        
        events.push("Stopped exploring. Out of energy.");
        if (pet.currentHp === 0) events.push("Fainted while wandering.");
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

// --- EVOLUTION PATH LOGIC ---
export const determineEvolutionPath = (stats: {atk: number, def: number, spd: number, happiness: number}) => {
    const { atk, def, spd, happiness } = stats;
    
    let dominant = 'BALANCED';
    let protocolName = 'Balanced';
    let color = 'text-gray-500';
    let borderColor = 'border-gray-500';
    let icon = '😐';
    let desc = "Keep grinding to specialize.";
    
    if (atk >= def && atk >= spd) {
        dominant = 'ATTACK';
        protocolName = 'Striker'; 
        color = 'text-red-500';
        borderColor = 'border-red-500';
        icon = '⚔️';
        desc = "Path: Glass Cannon";
    } else if (def > atk && def > spd) {
        dominant = 'DEFENSE';
        protocolName = 'Guardian';
        color = 'text-blue-500';
        borderColor = 'border-blue-500';
        icon = '🛡️';
        desc = "Path: Unbreakable";
    } else if (spd > atk && spd > def) {
        dominant = 'SPEED';
        protocolName = 'Speedster';
        color = 'text-yellow-500';
        borderColor = 'border-yellow-500';
        icon = '👟';
        desc = "Path: Mach 10";
    }
    
    let alignment = 'NEUTRAL';
    if (happiness >= 85) alignment = 'LUMINOUS'; 
    if (happiness <= 25) alignment = 'CORRUPTED';

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
    const accentMap: any = {
        Fire: '#EF4444', Water: '#3B82F6', Grass: '#22C55E', Electric: '#EAB308',
        Psychic: '#A855F7', Metal: '#6B7280', Dark: '#1F2937', Light: '#CA8A04',
        Spirit: '#6366F1', Toxic: '#84CC16'
    };

    const baseHex = hexMap[element] || '#CBD5E1';
    const accentHex = accentMap[element] || '#000000';

    let shapes = '';
    const shapeCount = 5 + (Math.abs(hash) % 5);
    for(let k=0; k<shapeCount; k++) {
        const cx = 20 + (Math.abs(hash * (k+1)) % 60);
        const cy = 20 + (Math.abs(hash * (k+2)) % 60);
        const r = 10 + (Math.abs(hash * (k+3)) % 20);
        if (k % 2 === 0) {
            shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accentHex}" fill-opacity="0.5" stroke="black" stroke-width="2" />`;
        } else {
             shapes += `<rect x="${cx}" y="${cy}" width="${r*2}" height="${r*2}" fill="white" fill-opacity="0.8" stroke="black" stroke-width="2" />`;
        }
    }

    const svg = `
    <svg width="300" height="300" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#000" fill-opacity="0.1"/>
            </pattern>
        </defs>
        <rect width="100" height="100" fill="${baseHex}" />
        <rect width="100" height="100" fill="url(#dots)" />
        <g transform="translate(5,5)">${shapes}</g>
        <circle cx="50" cy="50" r="25" fill="white" stroke="black" stroke-width="3" />
        <circle cx="40" cy="45" r="5" fill="black" />
        <circle cx="60" cy="45" r="5" fill="black" />
        <path d="M 45 60 Q 50 65 55 60" stroke="black" stroke-width="3" fill="none" />
        <text x="50" y="92" font-family="sans-serif" font-weight="900" font-size="12" text-anchor="middle" fill="black" stroke="white" stroke-width="0.5">${element.toUpperCase()}</text>
    </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const ELEMENT_THEMES: any = {
  Fire: { bg: 'bg-red-400', text: 'text-white', icon: '🔥', hex: 0xff4400 },
  Water: { bg: 'bg-blue-400', text: 'text-white', icon: '💧', hex: 0x0088ff },
  Grass: { bg: 'bg-green-400', text: 'text-black', icon: '🌿', hex: 0x00cc44 },
  Electric: { bg: 'bg-yellow-300', text: 'text-black', icon: '⚡', hex: 0xffcc00 },
  Psychic: { bg: 'bg-purple-400', text: 'text-white', icon: '🔮', hex: 0xaa00ff },
  Metal: { bg: 'bg-gray-300', text: 'text-black', icon: '⚙️', hex: 0x888888 },
  Dark: { bg: 'bg-gray-800', text: 'text-white', icon: '🌑', hex: 0x220044 },
  Light: { bg: 'bg-yellow-100', text: 'text-black', icon: '✨', hex: 0xffffee },
  Spirit: { bg: 'bg-indigo-400', text: 'text-white', icon: '👻', hex: 0x6600cc },
  Toxic: { bg: 'bg-lime-400', text: 'text-black', icon: '☣️', hex: 0x88cc00 },
};

export const ITEMS_DB: Record<string, GameItem> = {
    'pixel_pizza': {
        id: 'pixel_pizza', name: 'Pizza Slice', type: 'Food',
        description: 'Tasty snack. +40 Energy, +5 Happy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 40); pet.happiness = Math.min(100, (pet.happiness || 50) + 5); return pet; },
        icon: '🍕', rarity: 'Common', price: 30
    },
    'data_burger': {
        id: 'data_burger', name: 'Mega Burger', type: 'Food',
        description: 'Big meal. +60 Energy, +10 Happy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 60); pet.happiness = Math.min(100, (pet.happiness || 50) + 10); return pet; },
        icon: '🍔', rarity: 'Common', price: 60
    },
    'glitch_candy': {
        id: 'glitch_candy', name: 'Rainbow Candy', type: 'Food',
        description: 'Super sweet! +20 Happy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 10); pet.happiness = Math.min(100, (pet.happiness || 50) + 20); return pet; },
        icon: '🍬', rarity: 'Rare', price: 80
    },
    'neon_soda': {
        id: 'neon_soda', name: 'Zap Soda', type: 'Food',
        description: 'Fizzy drink. +20 Energy.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 20); pet.happiness += 5; return pet; },
        icon: '🥤', rarity: 'Common', price: 40
    },
    'potion_small': {
        id: 'potion_small', name: 'Mini Potion', type: 'Consumable',
        description: 'Heals 20 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 20); return pet; },
        icon: '🧪', rarity: 'Common', price: 50
    },
    'potion_super': {
        id: 'potion_super', name: 'Max Potion', type: 'Consumable',
        description: 'Heals 60 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 60); return pet; },
        icon: '💉', rarity: 'Rare', price: 150
    },
    'revive_chip': {
        id: 'revive_chip', name: 'Revive Kit', type: 'Consumable',
        description: 'Wakes up fainted pet.',
        effect: (pet: any) => { if(pet.currentHp <= 0) pet.currentHp = Math.floor(pet.maxHp * 0.5); return pet; },
        icon: '❤️', rarity: 'Epic', price: 500
    },
    'energy_drink': {
        id: 'energy_drink', name: 'Coffee', type: 'Consumable',
        description: 'Wake up! -50 Fatigue.',
        effect: (pet: any) => { pet.fatigue = Math.max(0, pet.fatigue - 50); return pet; },
        icon: '☕', rarity: 'Common', price: 100
    },
    'mystery_box': {
        id: 'mystery_box', name: 'Mystery Box', type: 'Consumable',
        description: 'What\'s inside??',
        effect: (pet: any) => { return pet; }, 
        icon: '🎁', rarity: 'Epic', price: 500
    },
    'driver_crimson': {
        id: 'driver_crimson', name: 'Power Chip', type: 'Gear',
        description: 'Permanently adds +5 ATK.',
        effect: (pet: any) => { pet.atk += 5; return pet; },
        icon: '⚔️', rarity: 'Rare', price: 1200
    },
    'driver_titanium': {
        id: 'driver_titanium', name: 'Armor Chip', type: 'Gear',
        description: 'Permanently adds +5 DEF.',
        effect: (pet: any) => { pet.def += 5; return pet; },
        icon: '🛡️', rarity: 'Rare', price: 1200
    },
    'driver_azure': {
        id: 'driver_azure', name: 'Speed Chip', type: 'Gear',
        description: 'Permanently adds +5 SPD.',
        effect: (pet: any) => { pet.spd += 5; return pet; },
        icon: '👟', rarity: 'Rare', price: 1200
    }
};

const ENEMY_PREFIXES: Record<string, string[]> = {
    Fire: ["Hot", "Flaming", "Spicy", "Burnt", "Inferno"],
    Water: ["Wet", "Soggy", "Splashy", "Deep", "Tidal"],
    Grass: ["Leafy", "Wild", "Mossy", "Green", "Jungle"],
    Electric: ["Zappy", "Static", "Wired", "Buzzing", "Volt"],
    Metal: ["Heavy", "Rusty", "Shiny", "Hard", "Alloy"],
    Psychic: ["Floaty", "Brainy", "Zen", "Magic", "Cosmic"],
    Dark: ["Gloomy", "Shadow", "Edgy", "Void", "Abyss"],
    Light: ["Shiny", "Bright", "Flashy", "Holy", "Solar"],
    Toxic: ["Yucky", "Slimy", "Gross", "Stinky", "Acid"],
    Spirit: ["Ghostly", "Spooky", "Faded", "Hollow", "Phantom"]
};

const ENEMY_SUFFIXES = ["Bot", "Blob", "Critter", "Bug", "Walker", "Drone", "Beast", "Glitch"];

export const getRandomEnemy = (rank: string, playerLevel: number, genVoxelFunc: any): any => {
    const elements = Object.keys(ELEMENT_THEMES);
    const element = elements[Math.floor(Math.random() * elements.length)];
    const types: BodyType[] = ['BIPED', 'QUADRUPED', 'FLOATING', 'WHEELED'];
    const bodyType = types[Math.floor(Math.random() * types.length)];
    
    const prefixes = ENEMY_PREFIXES[element] || ["Random"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = ENEMY_SUFFIXES[Math.floor(Math.random() * ENEMY_SUFFIXES.length)];
    const name = `${prefix} ${suffix}`;
    
    const levelVariance = Math.floor(Math.random() * 3) - 1; 
    const level = Math.max(1, playerLevel + levelVariance); 

    const art = getProceduralMonsterArt(name, element);
    const voxelCode = genVoxelFunc(element, bodyType); // Now generates 3D body

    return {
        id: `wild_${Date.now()}`,
        name: name,
        element,
        rarity: 'Common',
        stage: 'Noob', 
        rank: 'E',
        nature: 'Wild',
        personality: 'Angry',
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
        description: `A wild ${name}.`,
        ability: "None",
        moves: [],
        bodyType,
        tactic: 'AGGRESSIVE',
        cardArtUrl: art,
        voxelCode: voxelCode
    };
};

export const getLootDrop = (rank: string): string | null => {
    const rand = Math.random();
    if (rand > 0.95) return 'revive_chip';
    if (rand > 0.90) return 'mystery_box';
    if (rand > 0.80) return 'driver_crimson'; // Added gear to drop pool
    if (rand > 0.70) return 'potion_super';
    if (rand > 0.50) return 'neon_soda';
    if (rand > 0.30) return 'data_burger';
    return 'pixel_pizza';
};
