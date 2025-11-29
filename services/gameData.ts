
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGenericVoxel } from './gemini';

// --- SHARED TYPES ---
export interface ActiveMission {
    id: string;
    title: string;
    description: string;
    targetName: string;
    difficulty: string;
    rewards: string;
    progress: number;
    goal: number;
    isActive: boolean;
}

export interface UserProfile {
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

export interface Move {
    name: string;
    type: string;
    power: number;
    accuracy: number;
    description: string;
}

// --- MODULAR PARTS SYSTEM ---
export interface AttachedPart {
    id: string; 
    partId: string; 
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number }; 
    faceNormal: { x: number, y: number, z: number }; 
    partType: string;
}

export interface PartDefinition {
    id: string;
    name: string;
    category: 'LOCOMOTION' | 'OFFENSE' | 'SENSOR' | 'UTILITY' | 'COSMETIC';
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'God';
    cost: number; 
    stats: { hp?: number, atk?: number, def?: number, spd?: number, int?: number };
    description: string;
    voxelShapeType: string;
    colorTheme: 'Metal' | 'Accent' | 'Primary' | 'Energy' | 'Void' | 'Gold';
}

export const PARTS_DB: Record<string, PartDefinition> = {
    // STARTING / BASIC
    'part_leg_basic': { id: 'part_leg_basic', name: 'Starter Leg', category: 'LOCOMOTION', rarity: 'Common', cost: 10, stats: { spd: 5 }, description: 'Basic mobility unit.', voxelShapeType: 'LEG_BASIC', colorTheme: 'Primary' },
    'part_sensor_lite': { id: 'part_sensor_lite', name: 'Basic Eye', category: 'SENSOR', rarity: 'Common', cost: 10, stats: { int: 5 }, description: 'Standard visual input.', voxelShapeType: 'SENSOR', colorTheme: 'Accent' },
    'part_arm_stubby': { id: 'part_arm_stubby', name: 'Stubby Arm', category: 'UTILITY', rarity: 'Common', cost: 20, stats: { atk: 5 }, description: 'Small, round, and ready to hug.', voxelShapeType: 'ARM_STUBBY', colorTheme: 'Primary' },
    'part_shoe_round': { id: 'part_shoe_round', name: 'Round Shoe', category: 'LOCOMOTION', rarity: 'Common', cost: 20, stats: { spd: 8 }, description: 'Comfy walking gear.', voxelShapeType: 'SHOE_ROUND', colorTheme: 'Accent' },
    'part_blush': { id: 'part_blush', name: 'Blush Sticker', category: 'COSMETIC', rarity: 'Common', cost: 15, stats: { hp: 10 }, description: 'Increases cuteness by 200%.', voxelShapeType: 'BLUSH', colorTheme: 'Primary' },
    'part_ears_cat': { id: 'part_ears_cat', name: 'Neko Ears', category: 'COSMETIC', rarity: 'Rare', cost: 120, stats: { spd: 5, int: 5 }, description: 'Hear the digital purrs.', voxelShapeType: 'EARS_CAT', colorTheme: 'Primary' },

    // MECH / HEAVY
    'part_tracks': { id: 'part_tracks', name: 'Tank Treads', category: 'LOCOMOTION', rarity: 'Rare', cost: 200, stats: { def: 15, spd: -5, hp: 20 }, description: 'Crush terrain with heavy metal.', voxelShapeType: 'TRACKS', colorTheme: 'Metal' },
    'part_mech_leg': { id: 'part_mech_leg', name: 'Servo Leg', category: 'LOCOMOTION', rarity: 'Rare', cost: 150, stats: { spd: 8, atk: 2 }, description: 'Agile robotic limb.', voxelShapeType: 'LEG_MECH', colorTheme: 'Primary' },
    'part_cannon': { id: 'part_cannon', name: 'Plasma Cannon', category: 'OFFENSE', rarity: 'Epic', cost: 500, stats: { atk: 25, spd: -2 }, description: 'High caliber energy output.', voxelShapeType: 'CANNON', colorTheme: 'Accent' },
    'part_spike': { id: 'part_spike', name: 'Titan Spike', category: 'OFFENSE', rarity: 'Common', cost: 50, stats: { atk: 10, def: 5 }, description: 'Sharp and dangerous.', voxelShapeType: 'SPIKE', colorTheme: 'Accent' },
    'part_dish': { id: 'part_dish', name: 'Radar Dish', category: 'SENSOR', rarity: 'Rare', cost: 300, stats: { int: 20, spd: 5 }, description: 'Scans for weakness.', voxelShapeType: 'DISH', colorTheme: 'Metal' },
    'part_eye_cyclops': { id: 'part_eye_cyclops', name: 'Cyclops Eye', category: 'SENSOR', rarity: 'Rare', cost: 100, stats: { int: 10 }, description: 'Single optic precision.', voxelShapeType: 'EYE_CYCLOPS', colorTheme: 'Metal' },
    'part_wing_mech': { id: 'part_wing_mech', name: 'Aero Wing', category: 'LOCOMOTION', rarity: 'Epic', cost: 400, stats: { spd: 20, atk: 5 }, description: 'Aerodynamic plating.', voxelShapeType: 'WING_MECH', colorTheme: 'Primary' },

    // COSMETIC / ENHANCED
    'part_halo': { id: 'part_halo', name: 'Angel Halo', category: 'COSMETIC', rarity: 'Legendary', cost: 800, stats: { hp: 50, int: 20 }, description: 'Divine energy ring.', voxelShapeType: 'HALO', colorTheme: 'Energy' },
    'part_jetpack': { id: 'part_jetpack', name: 'Rocket Pack', category: 'UTILITY', rarity: 'Epic', cost: 600, stats: { spd: 25 }, description: 'Boost jump capability.', voxelShapeType: 'JETPACK', colorTheme: 'Metal' },
    'part_tail_dino': { id: 'part_tail_dino', name: 'Dino Tail', category: 'COSMETIC', rarity: 'Rare', cost: 250, stats: { atk: 10, def: 5 }, description: 'For balance and whacking.', voxelShapeType: 'TAIL_DINO', colorTheme: 'Primary' },

    // GOD TIER / MYTHIC (AAA UPDATE)
    'part_drill_heavy': { id: 'part_drill_heavy', name: 'Giga Drill', category: 'LOCOMOTION', rarity: 'Mythic', cost: 1500, stats: { atk: 40, spd: 10, def: 10 }, description: 'Pierces the heavens.', voxelShapeType: 'DRILL', colorTheme: 'Metal' },
    'part_katana_cyber': { id: 'part_katana_cyber', name: 'Neon Katana', category: 'OFFENSE', rarity: 'Mythic', cost: 2000, stats: { atk: 60, spd: 15 }, description: 'Sharp enough to cut glitches.', voxelShapeType: 'KATANA', colorTheme: 'Energy' },
    'part_wings_god': { id: 'part_wings_god', name: 'Seraphim Wings', category: 'UTILITY', rarity: 'God', cost: 9999, stats: { spd: 50, hp: 100, int: 50 }, description: 'Transcendent flight modules.', voxelShapeType: 'WINGS_GOD', colorTheme: 'Gold' },
    'part_cannon_void': { id: 'part_cannon_void', name: 'Void Launcher', category: 'OFFENSE', rarity: 'God', cost: 8500, stats: { atk: 80, int: 20 }, description: 'Channels dark matter.', voxelShapeType: 'CANNON_VOID', colorTheme: 'Void' }
};

export const GACHA_POOLS = {
    STANDARD: { cost: 100, pool: ['part_leg_basic', 'part_sensor_lite', 'part_arm_stubby', 'part_shoe_round', 'part_spike', 'part_blush', 'pixel_burger', 'potion_small', 'part_ears_cat'] },
    PREMIUM: { cost: 500, pool: ['part_tracks', 'part_mech_leg', 'part_cannon', 'part_dish', 'part_wing_mech', 'part_eye_cyclops', 'part_halo', 'part_jetpack', 'part_tail_dino', 'part_drill_heavy', 'part_katana_cyber'] },
    GOD_MODE: { cost: 2000, pool: ['part_wings_god', 'part_cannon_void', 'nano_repair_kit', 'part_drill_heavy', 'part_katana_cyber', 'part_halo'] }
};

export interface GameItem {
    id: string;
    name: string;
    type: 'Food' | 'Potion' | 'Material' | 'Consumable' | 'Artifact'; 
    effect?: { stat: string, val: number };
    price: number;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'God';
    description: string;
}

export const ITEMS_DB: Record<string, GameItem> = {
    'pixel_pizza': { id: 'pixel_pizza', name: 'Glitch Pizza', type: 'Food', effect: { stat: 'hunger', val: 30 }, price: 50, rarity: 'Common', description: 'Restores 30 Hunger.' },
    'pixel_burger': { id: 'pixel_burger', name: 'Byte Burger', type: 'Food', effect: { stat: 'hunger', val: 50 }, price: 80, rarity: 'Common', description: 'Restores 50 Hunger.' },
    'potion_small': { id: 'potion_small', name: 'Data Tonic', type: 'Potion', effect: { stat: 'hp', val: 50 }, price: 100, rarity: 'Common', description: 'Restores 50 HP.' },
    'nano_repair_kit': { id: 'nano_repair_kit', name: 'Nano Repair Kit', type: 'Consumable', effect: { stat: 'hp', val: 999 }, price: 1000, rarity: 'Mythic', description: 'Full Repair + Fatigue Reset.' },
    'ancient_chip': { id: 'ancient_chip', name: 'Ancient Chip', type: 'Material', price: 500, rarity: 'Legendary', description: 'A relic from the old web.' },
    'unidentified_artifact': { id: 'unidentified_artifact', name: 'Strange Artifact', type: 'Artifact', price: 5000, rarity: 'God', description: 'Needs AI Analysis.' },
};

export interface MonsterStats {
    hp: number; atk: number; def: number; spd: number;
}

export interface MonsterEntry {
    speciesId: string;
    name: string;
    element: string;
    stats: MonsterStats;
    visualTraits: any; 
    description: string;
}

export const MONSTER_DB: Record<string, MonsterEntry> = {
    'slime_v1': { speciesId: 'slime_v1', name: 'Slime.exe', element: 'Toxic', stats: { hp: 40, atk: 10, def: 10, spd: 10 }, visualTraits: { 
        anatomy: { headShape: 'ROUND', bodyShape: 'CHIBI_ROUND', eyeStyle: 'ANIME_LARGE', primaryColor: '#10B981', secondaryColor: '#A7F3D0', accentColor: '#064E3B' }
    }, description: 'A basic corrupted file.' },
    'fire_wolf': { speciesId: 'fire_wolf', name: 'Firewall Wolf', element: 'Fire', stats: { hp: 60, atk: 25, def: 15, spd: 30 }, visualTraits: { 
        anatomy: { headShape: 'FOX', bodyShape: 'QUAD_BEAST', eyeStyle: 'GLOW_SLIT', primaryColor: '#EF4444', secondaryColor: '#FCA5A5', accentColor: '#7F1D1D', hasTail: true }
    }, description: 'Guardian of the gateway.' },
    'golem_steel': { speciesId: 'golem_steel', name: 'Server Golem', element: 'Metal', stats: { hp: 100, atk: 20, def: 40, spd: 5 }, visualTraits: { 
        anatomy: { headShape: 'SQUARE', bodyShape: 'TALL_HUMANOID', eyeStyle: 'VISOR', primaryColor: '#64748B', secondaryColor: '#94A3B8', accentColor: '#0F172A' }
    }, description: 'Heavy duty data storage unit.' },
    'angel_prime': { speciesId: 'angel_prime', name: 'Seraphim X', element: 'Light', stats: { hp: 200, atk: 50, def: 30, spd: 40 }, visualTraits: { 
        anatomy: { headShape: 'ROUND', bodyShape: 'TALL_HUMANOID', eyeStyle: 'ANIME_LARGE', primaryColor: '#FBBF24', secondaryColor: '#FEF3C7', accentColor: '#FFF', hasWings: true, hasHalo: true }
    }, description: 'A high-tier guardian entity.' },
    'odin_mech': { speciesId: 'odin_mech', name: 'Odin Prime', element: 'Electric', stats: { hp: 500, atk: 100, def: 80, spd: 60 }, visualTraits: { 
        anatomy: { headShape: 'MECH', bodyShape: 'TITAN_HUMANOID', eyeStyle: 'CYCLOPS', primaryColor: '#FCD34D', secondaryColor: '#1E293B', accentColor: '#3B82F6', hasHorns: true }
    }, description: 'The All-Father of the Network.' },
};

// --- LOCATIONS ---
export interface LocationNode {
    id: string;
    name: string;
    levelReq: number;
    connections: string[];
    x: number; 
    y: number; 
    enemyTheme: string[];
    color: string;
    environmentType: 'Grass' | 'City' | 'Desert' | 'Snow' | 'Volcano' | 'Space' | 'Cyber' | 'Valhalla';
}

export const LOCATIONS_DB: Record<string, LocationNode> = {
    'loc_starter': { id: 'loc_starter', name: 'Origin Grid', levelReq: 1, connections: ['loc_forest', 'loc_arcade'], x: 50, y: 80, enemyTheme: ['Neutral'], color: 'bg-gray-400', environmentType: 'Grass' },
    'loc_forest': { id: 'loc_forest', name: 'Cache Jungle', levelReq: 5, connections: ['loc_starter', 'loc_cave', 'loc_ruins'], x: 30, y: 60, enemyTheme: ['Grass', 'Toxic'], color: 'bg-green-500', environmentType: 'Grass' },
    'loc_arcade': { id: 'loc_arcade', name: 'Neon Arcade', levelReq: 8, connections: ['loc_starter', 'loc_city'], x: 70, y: 70, enemyTheme: ['Electric', 'Psychic'], color: 'bg-pink-500', environmentType: 'City' },
    'loc_cave': { id: 'loc_cave', name: 'Deep Root', levelReq: 15, connections: ['loc_forest', 'loc_volcano'], x: 20, y: 40, enemyTheme: ['Dark', 'Metal'], color: 'bg-slate-700', environmentType: 'Desert' },
    'loc_ruins': { id: 'loc_ruins', name: 'Old Net Ruins', levelReq: 20, connections: ['loc_forest', 'loc_city'], x: 40, y: 30, enemyTheme: ['Spirit', 'Psychic'], color: 'bg-purple-500', environmentType: 'Desert' },
    'loc_city': { id: 'loc_city', name: 'Mainframe City', levelReq: 25, connections: ['loc_arcade', 'loc_ruins', 'loc_volcano'], x: 80, y: 40, enemyTheme: ['Electric', 'Metal'], color: 'bg-blue-600', environmentType: 'City' },
    'loc_volcano': { id: 'loc_volcano', name: 'Firewall Peak', levelReq: 40, connections: ['loc_cave', 'loc_city', 'loc_valhalla'], x: 50, y: 15, enemyTheme: ['Fire', 'Dark'], color: 'bg-red-600', environmentType: 'Volcano' },
    'loc_valhalla': { id: 'loc_valhalla', name: 'Cyber Valhalla', levelReq: 60, connections: ['loc_volcano'], x: 50, y: 5, enemyTheme: ['Light', 'Dragon'], color: 'bg-yellow-400', environmentType: 'Valhalla' },
};


// --- UTILS ---

export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend' | 'God';

export interface Pixupet {
    id: string;
    speciesId?: string; 
    name: string;
    element: string;
    level: number;
    exp: number;
    maxExp: number;
    hp: number; maxHp: number; currentHp: number;
    atk: number; def: number; spd: number;
    int?: number; 
    hunger: number; fatigue: number; happiness: number;
    stage: MonsterStage; 
    rank: string;
    ability: string;
    voxelCode: string;
    visualTraits: any;
    bodyType: string;
    moves: Move[];
    parts: AttachedPart[];
    imageSource?: string;
    cardArtUrl?: string;
    description?: string;
    isMinted?: boolean;
    nature?: string;
    potential?: number;
    visual_design?: any;
    rarity?: string;
}

export interface VisualTraits {
    extractedColors: { primary: string, secondary: string, accent: string };
    silhouetteMatrix?: string[];
    anatomy?: any; // New Anime Structure
}

export const ELEMENT_THEMES: Record<string, { color: string, bg: string, icon: string }> = {
    Fire: { color: 'text-red-500', bg: 'bg-red-500', icon: '🔥' },
    Water: { color: 'text-blue-500', bg: 'bg-blue-500', icon: '💧' },
    Grass: { color: 'text-green-500', bg: 'bg-green-500', icon: '🌿' },
    Electric: { color: 'text-yellow-400', bg: 'bg-yellow-400', icon: '⚡' },
    Psychic: { color: 'text-purple-500', bg: 'bg-purple-500', icon: '🔮' },
    Metal: { color: 'text-gray-400', bg: 'bg-gray-400', icon: '⚙️' },
    Dark: { color: 'text-gray-800', bg: 'bg-gray-800', icon: '🌑' },
    Light: { color: 'text-yellow-200', bg: 'bg-yellow-200', icon: '✨' },
    Toxic: { color: 'text-purple-800', bg: 'bg-purple-800', icon: '☠️' },
    Spirit: { color: 'text-indigo-400', bg: 'bg-indigo-400', icon: '👻' },
    Neutral: { color: 'text-gray-500', bg: 'bg-gray-500', icon: '⚪' },
};

export const EVO_THRESHOLDS = {
    'Pro': 10,
    'Elite': 30,
    'Legend': 60,
    'God': 90
};

export const EMOTE_ICONS = {
    HAPPY: 'heart',
    SAD: 'broken_heart',
    ANGRY: 'fire',
    SLEEP: 'zzz',
    HUNGRY: 'meat',
    BATTLE: 'swords',
    TREASURE: 'chest',
    ALERT: 'exclamation'
};

export const calculateStats = (pet: Pixupet) => {
    let { maxHp, atk, def, spd, int } = pet;
    
    // Apply Part Multipliers
    if (pet.parts) {
        pet.parts.forEach(p => {
            const partDef = PARTS_DB[p.partId]; 
            if(partDef && partDef.stats) {
                if(partDef.stats.hp) maxHp += partDef.stats.hp;
                if(partDef.stats.atk) atk += partDef.stats.atk;
                if(partDef.stats.def) def += partDef.stats.def; 
                if(partDef.stats.spd) spd += partDef.stats.spd;
                if(partDef.stats.int && int !== undefined) int += partDef.stats.int;
            }
        });
    }

    return { maxHp, currentHp: pet.currentHp, atk, def, spd, int };
};

export const getProceduralMonsterArt = (name: string, element: string) => {
    return `https://placehold.co/400x400/222/FFF?text=${name.substring(0,3)}`;
};

export const getRandomEventText = (locId: string) => {
    const texts = [
        "Scanning environment...",
        "Analyzing data streams...",
        "Searching for anomalies...",
        "Updating local map...",
        "Ping: 24ms",
        "Connection stable."
    ];
    return texts[Math.floor(Math.random() * texts.length)];
};

export const getActionFromText = (text: string) => {
    if (text.includes('Battle') || text.includes('Combat')) return 'ATTACK';
    if (text.includes('Searching') || text.includes('Scanning')) return 'WALK';
    return 'IDLE';
};

export const assignMoves = (element: string, level: number): Move[] => {
    return [
        { name: 'Tackle', type: 'Neutral', power: 40, accuracy: 100, description: 'A physical charge.' },
        { name: 'Glitch Beam', type: element, power: 60, accuracy: 90, description: 'Fires elemental data.' }
    ];
};

export const getPetSpeech = () => {
    const msgs = ["Beep boop!", "Systems nominal.", "I detect loot nearby.", "Hungry...", "Let's grind!"];
    return msgs[Math.floor(Math.random() * msgs.length)];
};

export const checkDiscovery = (user: UserProfile, id: string, type: 'SEEN' | 'CAUGHT') => {
    let updates: any = {};
    let isNew = false;
    if (type === 'SEEN' && !user.seen.includes(id)) {
        updates.seen = [...user.seen, id];
        isNew = true;
    }
    if (type === 'CAUGHT' && !user.caught.includes(id)) {
        updates.caught = [...user.caught, id];
        isNew = true;
    }
    return { isNew, updates };
};

export const getRandomEnemy = (locId: string, playerLevel: number, voxelGen: any): Pixupet => {
    const loc = LOCATIONS_DB[locId];
    // Simple logic: pick random from MONSTER_DB or generate
    const keys = Object.keys(MONSTER_DB);
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    const template = MONSTER_DB[randKey];
    
    // Scale enemies much higher in Valhalla
    let level = Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
    if(locId === 'loc_valhalla') level += 20;

    // Auto-scale stats
    const stats = {
        hp: template.stats.hp + (level * 5),
        atk: template.stats.atk + (level * 2),
        def: template.stats.def + (level * 2),
        spd: template.stats.spd + (level * 2),
    };

    return {
        id: `enemy_${Date.now()}`,
        speciesId: template.speciesId, // Include speciesId for discovery check
        name: template.name,
        element: template.element,
        level: level,
        exp: 0, maxExp: 100,
        hp: stats.hp, maxHp: stats.hp, currentHp: stats.hp,
        atk: stats.atk, def: stats.def, spd: stats.spd,
        hunger: 100, fatigue: 0, happiness: 100,
        stage: 'Noob', rank: 'Wild', ability: 'Wild Data',
        moves: [], parts: [],
        voxelCode: voxelGen(template.element, template.visualTraits.anatomy.bodyShape, 'Noob', template.visualTraits, template.name),
        visualTraits: template.visualTraits,
        bodyType: template.visualTraits.anatomy.bodyShape,
        isMinted: false
    } as any;
};

export const getLootDrop = (locId: string) => {
    const roll = Math.random();
    // High level locations drop better loot
    if (locId === 'loc_valhalla') {
        if(roll > 0.95) return 'unidentified_artifact'; // NEW
        if(roll > 0.9) return 'nano_repair_kit';
        if(roll > 0.7) return 'part_wings_god'; // Extremely rare direct drop
        if(roll > 0.5) return 'ancient_chip';
    }
    
    if (roll > 0.8) return 'potion_small';
    if (roll > 0.5) return 'pixel_burger';
    return 'pixel_pizza';
};

export const generateStarterOptions = () => {
    return [
        {
            name: 'Ignis', element: 'Fire', bodyType: 'BIPED', description: 'A fiery spirit with high attack potential.',
            stats: { hp: 50, atk: 18, def: 12, spd: 14 },
            visualTraits: { 
                anatomy: { headShape: 'FOX', bodyShape: 'CHIBI_ROUND', eyeStyle: 'ANIME_LARGE', primaryColor: '#EF4444', secondaryColor: '#FCA5A5', accentColor: '#7F1D1D', hasTail: true }
            }
        },
        {
            name: 'Aqua', element: 'Water', bodyType: 'FLOATING', description: 'Fluid movement and balanced defenses.',
            stats: { hp: 60, atk: 14, def: 16, spd: 12 },
            visualTraits: { 
                anatomy: { headShape: 'ROUND', bodyShape: 'FLOATING_ORB', eyeStyle: 'ANIME_LARGE', primaryColor: '#3B82F6', secondaryColor: '#93C5FD', accentColor: '#1E3A8A' }
            }
        },
        {
            name: 'Terra', element: 'Grass', bodyType: 'QUADRUPED', description: 'Sturdy frame with regenerative capabilities.',
            stats: { hp: 70, atk: 15, def: 15, spd: 10 },
            visualTraits: { 
                anatomy: { headShape: 'CAT', bodyShape: 'QUAD_BEAST', eyeStyle: 'DOTS', primaryColor: '#10B981', secondaryColor: '#6EE7B7', accentColor: '#064E3B' }
            }
        }
    ];
};
