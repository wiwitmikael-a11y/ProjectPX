
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGenericVoxel } from './gemini';

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';
export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend';
export type EquipmentSlot = 'HEAD' | 'BODY' | 'ACCESSORY';

export const ELEMENT_THEMES: Record<string, { bg: string; text: string; icon: string }> = {
    Fire: { bg: 'bg-red-500', text: 'text-red-500', icon: '🔥' },
    Water: { bg: 'bg-blue-500', text: 'text-blue-500', icon: '💧' },
    Grass: { bg: 'bg-green-500', text: 'text-green-500', icon: '🌿' },
    Electric: { bg: 'bg-yellow-400', text: 'text-yellow-500', icon: '⚡' },
    Psychic: { bg: 'bg-purple-500', text: 'text-purple-500', icon: '🔮' },
    Metal: { bg: 'bg-gray-400', text: 'text-gray-500', icon: '🔩' },
    Dark: { bg: 'bg-gray-800', text: 'text-gray-400', icon: '🌑' },
    Light: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '✨' },
    Spirit: { bg: 'bg-indigo-400', text: 'text-indigo-400', icon: '👻' },
    Toxic: { bg: 'bg-lime-500', text: 'text-lime-600', icon: '☠️' },
    Neutral: { bg: 'bg-gray-300', text: 'text-gray-600', icon: '🥚' }
};

export const EVO_THRESHOLDS = {
    PRO: 10,
    ELITE: 25,
    LEGEND: 50
};

export interface VisualTraits {
    hasHorns: boolean;
    hornStyle?: 'Uni' | 'Dual' | 'Antenna' | 'None';
    hasWings: boolean;
    wingStyle?: 'Feather' | 'Bat' | 'Mech' | 'None';
    accessory?: 'Goggles' | 'Scarf' | 'Helmet' | 'Backpack' | 'None';
    build: 'Chunky' | 'Slender' | 'Round';
    hasEars?: boolean; 
    surfaceFinish?: 'Matte' | 'Glossy' | 'Metallic' | 'Emissive';
    materialType?: 'Standard' | 'Magma' | 'Jelly' | 'Moss'; // Advanced Material Physics
    extractedColors?: {
        primary: string;   
        secondary: string; 
        accent: string;    
    };
}

export interface GameItem {
    id: string; 
    name: string; 
    type: 'Consumable' | 'Material' | 'Key' | 'Food' | 'Gear';
    slot?: EquipmentSlot; // Only for Gear
    statBonus?: { atk?: number, def?: number, spd?: number, hp?: number, int?: number };
    description: string; 
    effect?: (pet: any) => any; 
    icon?: string; // Kept as fallback type, but mostly unused
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; 
    price: number; 
    value?: number; 
}

export const ITEMS_DB: Record<string, GameItem> = {
    // FOOD
    'pixel_pizza': { id: 'pixel_pizza', name: 'Pixel Pizza', type: 'Food', description: '+40 Hunger.', rarity: 'Common', price: 30, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+40) }) },
    'data_burger': { id: 'data_burger', name: 'Data Burger', type: 'Food', description: '+60 Hunger.', rarity: 'Common', price: 60, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+60) }) },
    'neon_soda': { id: 'neon_soda', name: 'Neon Soda', type: 'Food', description: '+20 Hunger.', rarity: 'Common', price: 40, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+20) }) },
    'glitch_steak': { id: 'glitch_steak', name: 'Glitch Steak', type: 'Food', description: '+90 Hunger. Spicy!', rarity: 'Rare', price: 150, effect: (p)=>({ ...p, hunger: Math.min(100, p.hunger+90) }) },

    // CONSUMABLES
    'potion_small': { id: 'potion_small', name: 'Small Potion', type: 'Consumable', description: '+20 HP.', rarity: 'Common', price: 50, effect: (p)=>({ ...p, currentHp: Math.min(p.maxHp, p.currentHp+20) }) },
    'potion_super': { id: 'potion_super', name: 'Super Potion', type: 'Consumable', description: '+60 HP.', rarity: 'Rare', price: 150, effect: (p)=>({ ...p, currentHp: Math.min(p.maxHp, p.currentHp+60) }) },
    'revive_chip': { id: 'revive_chip', name: 'Revive Chip', type: 'Consumable', description: 'Revive 50% HP.', rarity: 'Epic', price: 500, effect: (p)=>({ ...p, currentHp: p.currentHp<=0 ? Math.floor(p.maxHp*0.5) : p.currentHp }) },

    // MATERIALS
    'chip_fire': { id: 'chip_fire', name: 'Magma Chip', type: 'Material', description: 'Warm to the touch.', rarity: 'Rare', price: 300 },
    'chip_water': { id: 'chip_water', name: 'Tidal Chip', type: 'Material', description: 'Always damp.', rarity: 'Rare', price: 300 },
    'chip_grass': { id: 'chip_grass', name: 'Bloom Chip', type: 'Material', description: 'Smells like rain.', rarity: 'Rare', price: 300 },
    'chip_electric': { id: 'chip_electric', name: 'Volt Chip', type: 'Material', description: 'Zaps your finger.', rarity: 'Rare', price: 300 },
    'chip_metal': { id: 'chip_metal', name: 'Alloy Chip', type: 'Material', description: 'Heavy and cold.', rarity: 'Rare', price: 300 },
    'chip_dark': { id: 'chip_dark', name: 'Void Chip', type: 'Material', description: 'Absorbs light.', rarity: 'Epic', price: 600 },

    // VITAMINS
    'vitamin_hp': { id: 'vitamin_hp', name: 'HP Up', type: 'Consumable', description: 'Perm +5 Max HP.', rarity: 'Epic', price: 1000, effect: (p)=>({ ...p, maxHp: p.maxHp+5, currentHp: p.currentHp+5 }) },
    'vitamin_atk': { id: 'vitamin_atk', name: 'Protein', type: 'Consumable', description: 'Perm +1 ATK.', rarity: 'Epic', price: 1000, effect: (p)=>({ ...p, atk: p.atk+1 }) },

    // GEAR - HEAD
    'helm_visor': { id: 'helm_visor', name: 'Tactical Visor', type: 'Gear', slot: 'HEAD', statBonus: { atk: 5, spd: 2 }, description: '+5 ATK. Scanner active.', rarity: 'Rare', price: 800 },
    'helm_iron': { id: 'helm_iron', name: 'Iron Helmet', type: 'Gear', slot: 'HEAD', statBonus: { def: 8 }, description: '+8 DEF. Solid protection.', rarity: 'Rare', price: 900 },
    'helm_cyber': { id: 'helm_cyber', name: 'Cyber Casque', type: 'Gear', slot: 'HEAD', statBonus: { def: 12, int: 5 }, description: 'Advanced neural link.', rarity: 'Epic', price: 1800 },
    'helm_crown': { id: 'helm_crown', name: 'King Crown', type: 'Gear', slot: 'HEAD', statBonus: { atk: 10, def: 5, spd: 5 }, description: 'Fit for a legend.', rarity: 'Legendary', price: 5000 },

    // GEAR - BODY
    'armor_plate': { id: 'armor_plate', name: 'Steel Plate', type: 'Gear', slot: 'BODY', statBonus: { def: 10 }, description: '+10 DEF. Heavy plating.', rarity: 'Rare', price: 1000 },
    'armor_vest': { id: 'armor_vest', name: 'Speed Vest', type: 'Gear', slot: 'BODY', statBonus: { spd: 8, def: 2 }, description: '+8 SPD. Light & fast.', rarity: 'Rare', price: 1000 },
    'armor_void': { id: 'armor_void', name: 'Void Shell', type: 'Gear', slot: 'BODY', statBonus: { def: 20, hp: 50 }, description: 'Absorbs impact.', rarity: 'Legendary', price: 6000 },
    
    // GEAR - ACCESSORY (Backpacks, Wings, Rings)
    'acc_ring': { id: 'acc_ring', name: 'Power Ring', type: 'Gear', slot: 'ACCESSORY', statBonus: { atk: 8 }, description: '+8 ATK. Glowing red.', rarity: 'Rare', price: 1200 },
    'acc_boots': { id: 'acc_boots', name: 'Turbo Boots', type: 'Gear', slot: 'ACCESSORY', statBonus: { spd: 10 }, description: '+10 SPD. Gotta go fast.', rarity: 'Epic', price: 1500 },
    'acc_charm': { id: 'acc_charm', name: 'Lucky Charm', type: 'Gear', slot: 'ACCESSORY', statBonus: { hp: 50 }, description: '+50 HP. Feels lucky.', rarity: 'Epic', price: 1500 },
    'wings_angel': { id: 'wings_angel', name: 'Holo Wings', type: 'Gear', slot: 'ACCESSORY', statBonus: { spd: 15, atk: 5 }, description: 'Flight module enabled.', rarity: 'Legendary', price: 8000 },
    'pack_jet': { id: 'pack_jet', name: 'Jet Thruster', type: 'Gear', slot: 'ACCESSORY', statBonus: { spd: 12 }, description: 'Boost propulsion.', rarity: 'Epic', price: 4500 },
    
    // DRIVERS
    'driver_crimson': { id: 'driver_crimson', name: 'Crimson Driver', type: 'Consumable', description: 'Temp +5 ATK Boost.', rarity: 'Rare', price: 500, effect: (p)=>({ ...p, atk: p.atk+5 }) },
    'mystery_box': { id: 'mystery_box', name: 'Mystery Box', type: 'Consumable', description: 'Random Loot.', rarity: 'Epic', price: 500 }
};

export interface LocationNode {
    id: string;
    name: string;
    description: string;
    levelReq: number;
    difficultyMod: number;
    lootTier: number;
    coinMod: number;
    x: number; 
    y: number; 
    connections: string[];
    color: string;
    enemyTheme: string[]; 
    exclusiveLoot: string[]; 
    environmentType?: string; 
}

export const LOCATIONS_DB: Record<string, LocationNode> = {
    'loc_starter': {
        id: 'loc_starter', name: 'Green Hills', description: 'Peaceful plains for beginners.',
        levelReq: 1, difficultyMod: 1.0, lootTier: 1, coinMod: 1.0,
        x: 50, y: 90, connections: ['loc_woods', 'loc_coast'], 
        color: 'bg-green-400', enemyTheme: ['Grass', 'Light'], exclusiveLoot: ['pixel_pizza'], environmentType: 'Grass'
    },
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
        color: 'bg-yellow-400', enemyTheme: ['Electric', 'Light'], exclusiveLoot: ['chip_electric'], environmentType: 'Electric'
    },
    'loc_city': {
        id: 'loc_city', name: 'Neon Metropolis', description: 'The hub of cyber-commerce.',
        levelReq: 20, difficultyMod: 2.0, lootTier: 2, coinMod: 2.5, 
        x: 50, y: 50, connections: ['loc_coast', 'loc_foundry', 'loc_sanctum'], 
        color: 'bg-cyan-500', enemyTheme: ['Electric', 'Metal'], exclusiveLoot: ['neon_soda', 'data_burger', 'helm_cyber'], environmentType: 'Metal'
    },
    'loc_foundry': {
        id: 'loc_foundry', name: 'Iron Foundry', description: 'Heavy industrial zone.',
        levelReq: 25, difficultyMod: 2.5, lootTier: 3, coinMod: 1.8,
        x: 30, y: 40, connections: ['loc_city', 'loc_caldera', 'loc_waste'], 
        color: 'bg-slate-500', enemyTheme: ['Metal', 'Fire'], exclusiveLoot: ['chip_metal', 'helm_iron'], environmentType: 'Metal'
    },
    'loc_sanctum': {
        id: 'loc_sanctum', name: 'Mystic Sanctum', description: 'Reality bends here.',
        levelReq: 25, difficultyMod: 2.5, lootTier: 3, coinMod: 1.8,
        x: 70, y: 40, connections: ['loc_city', 'loc_peaks', 'loc_waste'], 
        color: 'bg-purple-500', enemyTheme: ['Psychic', 'Spirit'], exclusiveLoot: ['potion_super', 'acc_ring'], environmentType: 'Psychic'
    },
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
        color: 'bg-pink-600', enemyTheme: ['Dark', 'Psychic'], exclusiveLoot: ['glitch_steak', 'vitamin_hp', 'acc_charm'], environmentType: 'Psychic'
    },
    'loc_void': {
        id: 'loc_void', name: 'The Glitch Layer', description: 'Absolute chaos. Legends only.',
        levelReq: 50, difficultyMod: 5.0, lootTier: 5, coinMod: 5.0,
        x: 50, y: 10, connections: ['loc_waste'], 
        color: 'bg-violet-900 border-white', enemyTheme: ['Dark', 'Spirit', 'Metal', 'Fire'], exclusiveLoot: ['chip_dark', 'vitamin_atk', 'mystery_box', 'helm_crown', 'armor_void', 'wings_angel'], environmentType: 'Dark'
    }
};

export const GAME_HINTS = [
    "Equipment adds permanent stats. Find Gear in high-level zones.",
    "Neon Metropolis is the best place to farm Gold.",
    "The Glitch Layer drops Legendary Gear.",
    "Evolution happens at Level 10, 25, and 50.",
    "Tougher zones give significantly more XP.",
    "Matchups: Water > Fire > Grass > Water | Electric > Metal.",
];

export const PET_SPEECH = [
    "Yo Tamer!", "Where are we going?", "I'm hungry...", "Nice shoes!", "Did you hear that?",
    "My gear is awesome.", "Am I real?", "Is this the matrix?", "I smell loot.",
    "Let's battle!", "Need upgrades!", "You're the best.", "Pixels look crisp today.",
    "Scanning...", "No bugs found.", "System optimal.", "Ready for action.",
    "Don't leave me!", "Infinite world?", "Look at those graphics.", "Can I have a snack?",
    "Charging...", "Updates pending...", "Hello world!"
];

export const getPetSpeech = (): string => {
    return PET_SPEECH[Math.floor(Math.random() * PET_SPEECH.length)];
};

export const EMOTE_ICONS: Record<string, string> = {
    'BATTLE': '❗',
    'TREASURE': '💎',
    'HAZARD': '💀',
    'DISCOVERY': '❓'
};

export interface Move {
    name: string; type: string; power: number; accuracy: number; description: string;
}

export interface MonsterStats {
    id: string; dateCreated: number; name: string; element: string; rarity: string;
    stage: MonsterStage; rank: string; nature: string; personality?: string;
    visual_design: string; bodyType: BodyType; potential: number;
    visualTraits?: VisualTraits; 
    hp: number; maxHp?: number; atk: number; def: number; spd: number; int: number;
    description: string; ability: string; moves: Move[]; tactic?: AITactic; happiness?: number;
    equipment?: {
        head?: string;
        body?: string;
        accessory?: string;
    };
}

export interface OfflineReport {
    secondsAway: number; xpGained: number; coinsFound: number;
    hungerLost: number; hpLost: number; events: string[];
}

// --- ICONIC STARTERS V2 (AAA DESIGN) ---
export const STARTER_PACKS = [
    {
        id: 'starter_fire', name: 'PYRO-BIT', element: 'Fire',
        description: 'A hybrid of a fox and a retro toaster. Its transparent amber body reveals a glowing heating element skeleton.',
        stats: { hp: 100, atk: 25, def: 15, spd: 20 },
        visual_design: 'Transparent fox with glowing internal ribs and sparkplug tail.', bodyType: 'QUADRUPED',
        visualTraits: { 
            hasHorns: false, hornStyle: 'None', 
            hasWings: false, wingStyle: 'None', 
            build: 'Chunky', accessory: 'None', hasEars: true, 
            surfaceFinish: 'Glossy', materialType: 'Jelly',
            extractedColors: { primary: '#F97316', secondary: '#FCD34D', accent: '#292524' } // Orange, Gold, DarkGrey
        }
    },
    {
        id: 'starter_water', name: 'FIZZ-BOT', element: 'Water',
        description: 'A bubble-tea mech piloted by a tiny axolotl. It hovers on water jets and shoots pearls.',
        stats: { hp: 110, atk: 15, def: 18, spd: 15 },
        visual_design: 'Floating blue cup with pink thrusters and axolotl inside.', bodyType: 'FLOATING',
        visualTraits: { 
            hasHorns: false, hornStyle: 'None', 
            hasWings: false, wingStyle: 'Mech', 
            build: 'Round', accessory: 'Helmet', hasEars: false, 
            surfaceFinish: 'Glossy', materialType: 'Jelly',
            extractedColors: { primary: '#06B6D4', secondary: '#F472B6', accent: '#EC4899' } // Cyan, Pink, HotPink
        }
    },
    {
        id: 'starter_grass', name: 'MOSS-AMP', element: 'Grass',
        description: 'A groovy frog carrying a massive mossy boombox on its back. Its vibes are heavy.',
        stats: { hp: 150, atk: 20, def: 25, spd: 10 },
        visual_design: 'Green frog with speaker box on back.', bodyType: 'QUADRUPED',
        visualTraits: { 
            hasHorns: false, hornStyle: 'None', 
            hasWings: false, wingStyle: 'None', 
            build: 'Chunky', accessory: 'Backpack', hasEars: false, 
            surfaceFinish: 'Matte', materialType: 'Moss',
            extractedColors: { primary: '#4ADE80', secondary: '#3F6212', accent: '#166534' } // Green, DarkMoss, DkGreen
        }
    }
];

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

/**
 * GENERATES "GEMINI 2.5 HIGH-FIDELITY" SVG ART
 * This function simulates the output of a generative AI model like Imagen or Gemini 2.5 Flash Image
 * by creating complex, layered vector graphics with noise gradients, patterns, and holographic effects.
 * 
 * Note: In a production app with backend, this would call `imagen-3.0-generate-001` or `gemini-2.5-flash-image`
 * via the API using a prompt based on the pet's visual design.
 */
export const getProceduralMonsterArt = (name: string, element: string): string => {
    const colors: any = { 
        Fire: { a: '#EF4444', b: '#7F1D1D', light: '#FCA5A5' }, 
        Water: { a: '#3B82F6', b: '#1E3A8A', light: '#93C5FD' }, 
        Grass: { a: '#10B981', b: '#064E3B', light: '#6EE7B7' }, 
        Electric: { a: '#F59E0B', b: '#78350F', light: '#FDE047' }, 
        Psychic: { a: '#8B5CF6', b: '#4C1D95', light: '#C4B5FD' }, 
        Metal: { a: '#94A3B8', b: '#475569', light: '#CBD5E1' }, 
        Dark: { a: '#374151', b: '#111827', light: '#9CA3AF' }, 
        Light: { a: '#FCD34D', b: '#B45309', light: '#FEF08A' }, 
        Toxic: { a: '#84CC16', b: '#365314', light: '#BEF264' }
    };
    const c = colors[element] || { a: '#CBD5E1', b: '#64748B', light: '#F1F5F9' };
    const initial = name.charAt(0).toUpperCase();

    // Complex SVG imitating "Gemini 2.5" Generative Vector Art
    const svg = `
    <svg width="300" height="450" viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <!-- Dynamic Gradient Background -->
            <radialGradient id="gradMain" cx="50%" cy="50%" r="70%" fx="50%" fy="30%">
                <stop offset="0%" style="stop-color:${c.light};stop-opacity:1" />
                <stop offset="50%" style="stop-color:${c.a};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${c.b};stop-opacity:1" />
            </radialGradient>
            
            <!-- Noise Filter for Texture -->
            <filter id="noiseTexture" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise"/>
                <feColorMatrix type="saturate" values="0" in="noise" result="desaturatedNoise"/>
                <feComponentTransfer in="desaturatedNoise" result="fadedNoise">
                    <feFuncA type="linear" slope="0.3"/> 
                </feComponentTransfer>
                <feComposite operator="in" in="fadedNoise" in2="SourceGraphic" result="texturedGraphic"/>
                <feBlend mode="overlay" in="texturedGraphic" in2="SourceGraphic"/>
            </filter>

            <!-- Holographic Glow -->
            <filter id="holographicGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <!-- Tech Pattern -->
            <pattern id="techPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none"/>
                <path d="M10 10h20v20h-20z" fill="none" stroke="${c.light}" stroke-opacity="0.1" stroke-width="2"/>
                <circle cx="20" cy="20" r="2" fill="${c.light}" fill-opacity="0.2"/>
                <path d="M0 0l10 10M40 0l-10 10M0 40l10-10M40 40l-10-10" stroke="${c.light}" stroke-opacity="0.1" stroke-width="1"/>
            </pattern>
        </defs>
        
        <!-- Card Body -->
        <rect x="0" y="0" width="300" height="450" fill="url(#gradMain)" />
        
        <!-- Texture Overlay -->
        <rect x="0" y="0" width="300" height="450" filter="url(#noiseTexture)" opacity="0.6" />
        
        <!-- Tech Pattern Overlay -->
        <rect x="0" y="0" width="300" height="450" fill="url(#techPattern)" />
        
        <!-- Center Art (Abstract Representation) -->
        <g transform="translate(150, 200)">
            <circle cx="0" cy="0" r="90" fill="none" stroke="white" stroke-width="4" stroke-opacity="0.5" />
            <circle cx="0" cy="0" r="80" fill="${c.b}" fill-opacity="0.8" />
            <circle cx="0" cy="0" r="70" fill="none" stroke="${c.light}" stroke-width="2" stroke-dasharray="10,5" />
            
            <!-- Elemental Glyph -->
            <text x="0" y="35" font-family="monospace" font-size="120" font-weight="900" fill="white" text-anchor="middle" filter="url(#holographicGlow)" opacity="0.9">${initial}</text>
        </g>
        
        <!-- Holographic Sheen Lines -->
        <path d="M0 0 L300 450 L300 0 Z" fill="url(#gradMain)" opacity="0.1" style="mix-blend-mode: screen;" />
        <line x1="0" y1="450" x2="300" y2="0" stroke="white" stroke-width="2" opacity="0.2" />
        
        <!-- Card Frame -->
        <rect x="10" y="10" width="280" height="430" rx="20" fill="none" stroke="white" stroke-width="8" stroke-opacity="0.8" />
        <rect x="18" y="18" width="264" height="414" rx="15" fill="none" stroke="${c.b}" stroke-width="2" />

        <!-- Element Badge Bottom -->
        <g transform="translate(150, 380)">
            <rect x="-60" y="-15" width="120" height="30" rx="15" fill="black" fill-opacity="0.6" stroke="white" stroke-width="2" />
            <text x="0" y="5" font-family="sans-serif" font-size="14" font-weight="bold" fill="${c.light}" text-anchor="middle" letter-spacing="2" style="text-transform: uppercase;">${element}</text>
        </g>

    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const getRandomEnemy = (locationId: string, playerLevel: number, genVoxelFunc: any): any => {
    const loc = LOCATIONS_DB[locationId] || LOCATIONS_DB['loc_starter'];
    const themes = loc.enemyTheme || Object.keys(ELEMENT_THEMES);
    const element = themes[Math.floor(Math.random() * themes.length)];
    const bodyType: BodyType = ['BIPED', 'QUADRUPED', 'FLOATING'][Math.floor(Math.random()*3)] as BodyType;
    
    const name = `Wild ${element} Bot`;
    const level = Math.max(1, Math.floor(playerLevel * loc.difficultyMod)); 
    const enemyStage = level > 40 ? 'Legend' : level > 25 ? 'Elite' : level > 10 ? 'Pro' : 'Noob';
    
    const wildTraits: VisualTraits = {
        hasHorns: Math.random() > 0.5,
        hornStyle: ['Uni', 'Dual', 'Antenna'][Math.floor(Math.random()*3)] as any,
        hasWings: element === 'Electric' || element === 'Psychic' || Math.random() > 0.8,
        wingStyle: 'Mech',
        build: Math.random() > 0.5 ? 'Chunky' : 'Slender',
        accessory: Math.random() > 0.8 ? 'Helmet' : 'None',
        hasEars: Math.random() > 0.7,
        surfaceFinish: 'Matte',
        extractedColors: { primary: '#555555', secondary: '#aaaaaa', accent: '#ff0000' }
    };

    const maxHp = Math.floor(60 * loc.difficultyMod + level*10);

    return {
        id: `wild_${Date.now()}`, name, element, stage: enemyStage,
        hp: maxHp,
        currentHp: maxHp,
        maxHp: maxHp,
        atk: Math.floor(10 * loc.difficultyMod + level*2),
        def: Math.floor(10 * loc.difficultyMod + level*2),
        level,
        visualTraits: wildTraits,
        voxelCode: genVoxelFunc(element, bodyType, enemyStage, wildTraits)
    };
};

export const getLootDrop = (locationId: string): string | null => {
    const loc = LOCATIONS_DB[locationId] || LOCATIONS_DB['loc_starter'];
    const rand = Math.random();
    if (loc.exclusiveLoot && loc.exclusiveLoot.length > 0 && rand > 0.85) {
        return loc.exclusiveLoot[Math.floor(Math.random() * loc.exclusiveLoot.length)];
    }
    if (loc.lootTier >= 3 && rand > 0.9) return 'acc_boots'; 
    if (loc.lootTier >= 3 && rand > 0.95) return 'helm_iron';
    if (loc.lootTier >= 2 && rand > 0.8) return 'potion_super';
    if (rand > 0.6) return 'neon_soda';
    if (rand > 0.4) return 'data_burger';
    return 'pixel_pizza';
};

export const getRandomEventText = (locationId: string): string => {
    const loc = LOCATIONS_DB[locationId];
    // REMOVED LAZY EVENTS - ACTIVE ONLY
    const generic = ["Scouting perimeter.", "Analyzing terrain.", "Hunting for loot.", "Patrolling area.", "Training combat protocols."];
    const specific: Record<string, string[]> = {
        'loc_starter': ["Chasing butterflies.", "Rolling down hills.", "Practicing jumps.", "Target practice."],
        'loc_woods': ["Tracking footprints.", "Scanning for bugs.", "Climbing trees.", "Listening to birds."],
        'loc_coast': ["Splashing in waves.", "Chasing crabs.", "Scanning horizon.", "Training in sand."],
        'loc_caldera': ["Dodging lava.", "Scanning heat signatures.", "Training heat resistance.", "Analyzing magma flow."],
        'loc_city': ["Browsing shops.", "Hacking terminals.", "Scanning network.", "Navigating crowds."],
        'loc_void': ["Fighting the void.", "Analyzing glitches.", "Scanning anomalies.", "Resisting corruption."]
    };
    const pool = specific[locationId] || generic;
    return pool[Math.floor(Math.random() * pool.length)];
};

export const getActionFromText = (text: string): 'WALK' | 'SLEEP' | 'JUMP' | 'SCAN' | 'RUN' => {
    const lower = text.toLowerCase();
    if (lower.includes('rest') && Math.random() > 0.7) return 'SLEEP'; 
    if (lower.includes('jump') || lower.includes('hop') || lower.includes('dodge') || lower.includes('climb')) return 'JUMP';
    if (lower.includes('scan') || lower.includes('hack') || lower.includes('look') || lower.includes('analyz')) return 'SCAN';
    if (lower.includes('chase') || lower.includes('run') || lower.includes('track') || lower.includes('hunt') || lower.includes('fight')) return 'RUN';
    return 'WALK';
};

export interface SpecialEvent {
    type: 'BATTLE' | 'TREASURE' | 'HAZARD' | 'DISCOVERY';
    title: string;
    description: string;
    effectValue: number; 
    logs: string[];
    resultText: string;
}

export const getRandomSpecialEvent = (locationId: string): SpecialEvent => {
    const loc = LOCATIONS_DB[locationId];
    const roll = Math.random();

    if (loc.difficultyMod > 1.5 && roll < 0.15) {
        const hazards = [
            { title: "MAGMA SURGE", desc: "A lava geyser erupted!", logs: ["Ground is shaking...", "Heat rising fast!", "Took burn damage."], res: "ESCAPED" },
            { title: "GLITCH TRAP", desc: "Stepped on a corrupted tile.", logs: ["Data corruption detected.", "Movement slowed.", "HP drained."], res: "RECOVERED" },
            { title: "ACID RAIN", desc: "Toxic downpour.", logs: ["Sky turning green...", "Armor corroding.", "Shields down."], res: "SURVIVED" }
        ];
        const h = hazards[Math.floor(Math.random() * hazards.length)];
        return { type: 'HAZARD', title: h.title, description: h.desc, effectValue: 20, logs: h.logs, resultText: h.res };
    }

    if (roll > 0.85) {
        const discoveries = [
            { title: "ANCIENT RUIN", desc: "Found old data archives.", logs: ["Deciphering glyphs...", "Downloading history.", "Knowledge gained."], res: "KNOWLEDGE" },
            { title: "MANA SPRING", desc: "A glowing pool of energy.", logs: ["Resting by the pool...", "Energy restoring.", "Feeling stronger."], res: "REFRESHED" }
        ];
        const d = discoveries[Math.floor(Math.random() * discoveries.length)];
        return { type: 'DISCOVERY', title: d.title, description: d.desc, effectValue: 50, logs: d.logs, resultText: d.res };
    }

    return { type: 'DISCOVERY', title: "QUIET MOMENT", description: "Nothing happened.", effectValue: 0, logs: ["Looking around...", "All quiet."], resultText: "PEACEFUL" };
};
