
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';
export type WeatherType = 'CLEAR' | 'RAIN' | 'STORM' | 'NEON_MIST';
// NEW STAGE NAMES: Cyber-Organic Theme
export type MonsterStage = 'Spark' | 'Surge' | 'Turbo' | 'Nova';

export const EVO_THRESHOLDS = {
    SURGE: 10,
    TURBO: 25,
    NOVA: 50
};

export interface GameItem {
    id: string;
    name: string;
    type: 'Consumable' | 'Material' | 'Key' | 'Food';
    description: string;
    effect?: (pet: any) => any;
    icon: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    price: number;
    value?: number; 
}

export interface ObjectArchetype {
    element: string;
    defaultBodyType: BodyType;
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
    int?: number;
}

export interface OfflineReport {
    secondsAway: number;
    xpGained: number;
    coinsFound: number;
    hungerLost: number;
    hpLost: number;
    events: string[];
}

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
        events.push(`Explored for ${(diffSeconds/60).toFixed(0)} mins.`);
    } else {
        const safeTime = pet.hunger / hungerDropRate;
        const starvingTime = diffSeconds - safeTime;
        
        xpGained = Math.floor(safeTime * xpRate);
        pet.hunger = 0;
        
        hpLost = Math.floor(starvingTime * (5/3600));
        pet.currentHp = Math.max(0, pet.currentHp - hpLost);
        
        events.push("Ran out of food and got weak...");
        if (pet.currentHp === 0) events.push("Fainted from hunger!");
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

// --- EVOLUTION PATH LOGIC (THE PROTOCOLS) ---
export const determineEvolutionPath = (stats: {atk: number, def: number, spd: number, happiness: number}) => {
    const { atk, def, spd, happiness } = stats;
    
    // 1. Determine Dominant Protocol based on highest stat
    let dominant = 'BALANCED';
    let protocolName = 'Core Protocol';
    
    if (atk >= def && atk >= spd) {
        dominant = 'ATTACK';
        protocolName = 'Crimson Protocol'; // Striker
    } else if (def > atk && def > spd) {
        dominant = 'DEFENSE';
        protocolName = 'Titanium Protocol'; // Tank
    } else if (spd > atk && spd > def) {
        dominant = 'SPEED';
        protocolName = 'Azure Protocol'; // Speedster
    }
    
    // 2. Determine Alignment (Corruption vs Ascension)
    let alignment = 'NEUTRAL';
    if (happiness >= 85) alignment = 'LUMINOUS'; // Holy/Ascended
    if (happiness <= 25) alignment = 'CORRUPTED'; // Dark/Glitch

    return { dominant, alignment, protocolName };
};

// --- PROCEDURAL ART GENERATOR ---
export const getProceduralMonsterArt = (name: string, element: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = ELEMENT_THEMES[element as keyof typeof ELEMENT_THEMES] || { bg: '#888', text: '#fff' };
    const primaryColor = colors.bg.replace('bg-', '').replace('-400', ''); 
    
    const hexMap: any = {
        Fire: '#F87171', Water: '#60A5FA', Grass: '#4ADE80', Electric: '#FACC15',
        Psychic: '#C084FC', Metal: '#9CA3AF', Dark: '#1F2937', Light: '#FEF08A',
        Spirit: '#818CF8', Toxic: '#A3E635'
    };
    const baseHex = hexMap[element] || '#999';

    const shapes = [];
    for(let i=0; i<5; i++) {
        const sX = Math.abs((hash * (i+1) * 345) % 100);
        const sY = Math.abs((hash * (i+2) * 678) % 100);
        const sR = Math.abs((hash * (i+3) * 123) % 30) + 10;
        shapes.push(`<circle cx="${sX}" cy="${sY}" r="${sR}" fill="${baseHex}" fill-opacity="0.4" />`);
        shapes.push(`<rect x="${100-sX}" y="${100-sY}" width="${sR}" height="${sR}" fill="#fff" fill-opacity="0.2" transform="rotate(${sX} ${100-sX} ${100-sY})" />`);
    }

    const svg = `
    <svg width="200" height="280" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${baseHex};stop-opacity:1" />
                <stop offset="100%" style="stop-color:#000;stop-opacity:1" />
            </linearGradient>
            <filter id="glitch">
                <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="1" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
        </defs>
        <rect width="100" height="140" fill="url(#grad)" />
        <g filter="url(#glitch)">
            ${shapes.join('')}
            <text x="50" y="70" font-family="monospace" font-size="40" text-anchor="middle" fill="white" opacity="0.5">?</text>
            <path d="M20,120 L80,120 L50,20 Z" fill="none" stroke="white" stroke-width="2" />
        </g>
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="white" stroke-width="1" stroke-dasharray="4 2" />
    </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};


export const ELEMENT_THEMES: any = {
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

export const ITEMS_DB: Record<string, GameItem> = {
    'pixel_pizza': {
        id: 'pixel_pizza', name: 'Pixel Pizza', type: 'Food',
        description: 'Greasy, blocky goodness. +40 Hunger.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 40); pet.happiness = Math.min(100, (pet.happiness || 50) + 5); return pet; },
        icon: '🍕', rarity: 'Common', price: 30
    },
    'data_burger': {
        id: 'data_burger', name: 'Data Burger', type: 'Food',
        description: 'Packed with bytes. +60 Hunger.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 60); pet.happiness = Math.min(100, (pet.happiness || 50) + 10); return pet; },
        icon: '🍔', rarity: 'Common', price: 60
    },
    'glitch_candy': {
        id: 'glitch_candy', name: 'Glitch Candy', type: 'Food',
        description: 'Spicy code errors. +10 Hunger, High Happiness.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 10); pet.happiness = Math.min(100, (pet.happiness || 50) + 20); return pet; },
        icon: '🍬', rarity: 'Rare', price: 80
    },
    'void_soup': {
        id: 'void_soup', name: 'Void Soup', type: 'Food',
        description: 'Dark matter broth. +80 Hunger, chance to confuse.',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 80); return pet; },
        icon: '🍲', rarity: 'Epic', price: 120
    },
    'neon_soda': {
        id: 'neon_soda', name: 'Neon Soda', type: 'Food',
        description: 'Glowing fizz. +20 Hunger, +20 Speed boost (temp).',
        effect: (pet: any) => { pet.hunger = Math.min(100, pet.hunger + 20); pet.happiness += 5; return pet; },
        icon: '🥤', rarity: 'Common', price: 40
    },
    
    // CONSUMABLES
    'potion_small': {
        id: 'potion_small', name: 'Mini Data Pack', type: 'Consumable',
        description: 'Restores 20 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 20); return pet; },
        icon: '❤️', rarity: 'Common', price: 50
    },
    'potion_super': {
        id: 'potion_super', name: 'Macro Data Pack', type: 'Consumable',
        description: 'Restores 60 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 60); return pet; },
        icon: '💖', rarity: 'Rare', price: 150
    },
    'revive_chip': {
        id: 'revive_chip', name: 'Reboot Chip', type: 'Consumable',
        description: 'Revives a fainted pet with 50% HP.',
        effect: (pet: any) => { if(pet.currentHp <= 0) pet.currentHp = Math.floor(pet.maxHp * 0.5); return pet; },
        icon: '💾', rarity: 'Epic', price: 500
    },
    'energy_drink': {
        id: 'energy_drink', name: 'Voltage Cola', type: 'Consumable',
        description: 'Restores 50 Fatigue.',
        effect: (pet: any) => { pet.fatigue = Math.max(0, pet.fatigue - 50); return pet; },
        icon: '⚡', rarity: 'Common', price: 100
    },
    'atk_boost': {
        id: 'atk_boost', name: 'Crimson Drive', type: 'Consumable',
        description: 'Permanently increases ATK by 5.',
        effect: (pet: any) => { pet.atk += 5; return pet; },
        icon: '⚔️', rarity: 'Rare', price: 1000
    },
    'spd_boost': {
        id: 'spd_boost', name: 'Azure Drive', type: 'Consumable',
        description: 'Permanently increases SPD by 5.',
        effect: (pet: any) => { pet.spd += 5; return pet; },
        icon: '⏩', rarity: 'Rare', price: 1000
    },
    'mystery_box': {
        id: 'mystery_box', name: 'Mystery Box', type: 'Consumable',
        description: 'Contains a random item.',
        effect: (pet: any) => { return pet; }, // Logic handled in app
        icon: '🎁', rarity: 'Epic', price: 500
    }
};

const ENEMY_PREFIXES: Record<string, string[]> = {
    Fire: ["Pyro", "Flame", "Blaze", "Heat", "Ember", "Inferno", "Solar", "Magma"],
    Water: ["Hydro", "Aqua", "Tide", "Mist", "Rain", "Deep", "Bubble", "Tsunami"],
    Grass: ["Leaf", "Vine", "Root", "Thorn", "Bloom", "Forest", "Moss", "Spore"],
    Electric: ["Volt", "Shock", "Zap", "Thunder", "Spark", "Neon", "Pulse", "Gigawatt"],
    Metal: ["Iron", "Steel", "Chrome", "Gear", "Rusty", "Alloy", "Cyber", "Mecha"],
    Psychic: ["Mind", "Psi", "Dream", "Cosmic", "Zen", "Aura", "Brain", "Tele"],
    Dark: ["Shadow", "Void", "Night", "Dusk", "Grim", "Abyss", "Null", "Obsidian"],
    Light: ["Luma", "Star", "Sun", "Flash", "Holy", "Prism", "Bright", "Photon"],
    Toxic: ["Venom", "Sludge", "Acid", "Poison", "Tox", "Virus", "Blight", "Rad"],
    Spirit: ["Ghost", "Soul", "Phantom", "Specter", "Wisp", "Ecto", "Spirit", "Wraith"]
};

const ENEMY_SUFFIXES = ["Fang", "Claw", "Wing", "Bot", "Droid", "Beast", "Guardian", "Drone", "Stalker", "Watcher", "Glitch", "Maw", "Shell", "Core", "Unit"];

const getEnemyName = (element: string) => {
    const prefixes = ENEMY_PREFIXES[element] || ["Data"];
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
    
    const level = Math.max(1, playerLevel + (Math.floor(Math.random() * 3) - 1)); 

    // Generate procedural art immediately
    const art = getProceduralMonsterArt(name, element);

    return {
        id: `wild_${Date.now()}`,
        name: name,
        element,
        rarity: 'Common',
        stage: 'Spark', // Wild ones are mostly Spark/Rookie
        rank: 'E',
        nature: 'Wild',
        personality: 'Aggressive',
        visual_design: `A wild ${name}.`,
        potential: 1,
        hp: 70 + level * 12,
        maxHp: 70 + level * 12,
        atk: 15 + level * 2.5,
        def: 15 + level * 2.5,
        spd: 15 + level * 2.5,
        int: 10,
        level: level,
        exp: 20 * level,
        description: `A wild ${name} wandering the digital plains.`,
        ability: "Glitch Aura",
        moves: [],
        bodyType,
        tactic: 'AGGRESSIVE',
        cardArtUrl: art // Attach art
    };
};

export const getLootDrop = (rank: string): string | null => {
    const rand = Math.random();
    if (rand > 0.98) return 'revive_chip';
    if (rand > 0.90) return 'mystery_box';
    if (rand > 0.85) return 'potion_super';
    if (rand > 0.60) return 'potion_small';
    if (rand > 0.50) return 'energy_drink';
    if (rand > 0.30) return 'data_burger';
    if (rand > 0.15) return 'pixel_pizza';
    return null;
};
