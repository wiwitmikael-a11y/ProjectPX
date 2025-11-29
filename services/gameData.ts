
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGenericVoxel } from './gemini';

// --- TYPES ---
export interface ActiveMission {
    id: string; title: string; description: string; targetName: string; difficulty: string; rewards: string; progress: number; goal: number; isActive: boolean;
}

export interface Move {
    name: string; type: string; power: number; accuracy: number; description: string;
}

export interface AttachedPart {
    id: string; partId: string; position: { x: number, y: number, z: number }; rotation: { x: number, y: number, z: number }; faceNormal: { x: number, y: number, z: number }; partType: string;
}

export interface PartDefinition {
    id: string; name: string; category: string; rarity: string; cost: number; stats: any; description: string; voxelShapeType: string; colorTheme: string;
}

// UPDATE: Expanded Anatomy Schema for Modular Assembly (Based on User Grid Refs)
// Head: 4x3 Grid (12 types) | Others: 3x3 Grid (9 types)
export interface VisualTraits {
    anatomy: {
        // 4x3 GRID (12 VARIANTS)
        headShape: 
            'ROUND' | 'OVAL' | 'SQUARE' | // ROW 1 (Basic)
            'CAT' | 'FOX' | 'WOLF' |      // ROW 2 (Beast)
            'DRAGON' | 'LIZARD' | 'TV' |  // ROW 3 (Exotic/Mech)
            'SKULL' | 'FLOWER' | 'GHOST'; // ROW 4 (Special)
        
        // 3x3 GRID (9 VARIANTS)
        bodyShape: 
            'ORB' | 'PEAR' | 'BOX' |          // ROW 1
            'HUMANOID' | 'MUSCLE' | 'SLIM' |  // ROW 2
            'QUAD' | 'SERPENT' | 'FLOATING';  // ROW 3
        
        // 3x3 GRID
        limbStyle: 
            'NUBS' | 'PAWS' | 'HOOVES' |       // ROW 1
            'BOOTS' | 'CLAWS' | 'TALONS' |     // ROW 2
            'MECH' | 'WHEELS' | 'NONE';        // ROW 3
        
        // 3x3 GRID
        tailStyle: 
            'NONE' | 'CAT' | 'FOX' |           // ROW 1
            'LIZARD' | 'DEVIL' | 'FISH' |      // ROW 2
            'MECH_PLUG' | 'STINGER' | 'GHOST'; // ROW 3
        
        // 3x3 GRID
        wingStyle: 
            'NONE' | 'FEATHER' | 'BAT' |       // ROW 1
            'BUTTERFLY' | 'MECH' | 'CRYSTAL' | // ROW 2
            'CAPE' | 'SCARF' | 'SPIKES';       // ROW 3
        
        // EXTRAS
        eyeStyle: 'ANIME_LARGE' | 'DOTS' | 'VISOR' | 'CYCLOPS' | 'GLOW_SLIT';
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
    };
    // NEW: Sculpting Parameters for Vertex Deformation Engine
    sculptParams?: {
        roughness?: number; // 0-1 (Smooth -> Furry/Scaly)
        sharpness?: number; // 0-1 (Round -> Angular)
        distortion?: number; // 0-1 (Symmetrical -> Alien)
    };
    extractedColors?: {
        primary: string;
        secondary: string;
        accent: string;
    };
}

export type MonsterStage = 'Noob' | 'Pro' | 'Elite' | 'Legend' | 'God' | 'Starter';

export interface Pixupet {
    id: string;
    name: string;
    element: string;
    level: number;
    exp: number;
    maxExp: number;
    hp: number;
    maxHp: number;
    currentHp: number;
    atk: number;
    def: number;
    spd: number;
    int?: number;
    hunger: number;
    fatigue: number;
    happiness: number;
    stage: MonsterStage;
    rank?: string;
    description?: string;
    ability?: string;
    voxelCode: string;
    imageSource?: string;
    cardArtUrl?: string;
    visualTraits?: VisualTraits;
    parts?: AttachedPart[];
    dateCreated?: number;
    bodyType?: string;
}

export interface GameItem {
    id: string;
    name: string;
    type?: string;
    category?: string;
    effect?: { stat: string; val: number };
    price: number;
    rarity: string;
    description: string;
    stats?: any;
    voxelShapeType?: string;
    colorTheme?: string;
}

// --- DBs ---

export const PARTS_DB: Record<string, PartDefinition> = {
    'part_leg_basic': { id: 'part_leg_basic', name: 'Starter Leg', category: 'LOCOMOTION', rarity: 'Common', cost: 10, stats: { spd: 5 }, description: 'Basic mobility unit.', voxelShapeType: 'LEG_BASIC', colorTheme: 'Primary' },
    'part_arm_stubby': { id: 'part_arm_stubby', name: 'Stubby Arm', category: 'UTILITY', rarity: 'Common', cost: 20, stats: { atk: 5 }, description: 'Small arm.', voxelShapeType: 'ARM_STUBBY', colorTheme: 'Primary' },
    'part_ears_cat': { id: 'part_ears_cat', name: 'Neko Ears', category: 'COSMETIC', rarity: 'Rare', cost: 120, stats: { spd: 5, int: 5 }, description: 'Hear the digital purrs.', voxelShapeType: 'EARS_CAT', colorTheme: 'Primary' },
    'part_halo': { id: 'part_halo', name: 'Angel Halo', category: 'COSMETIC', rarity: 'Legendary', cost: 800, stats: { hp: 50, int: 20 }, description: 'Divine energy.', voxelShapeType: 'HALO', colorTheme: 'Energy' },
    'part_wings_god': { id: 'part_wings_god', name: 'Seraphim Wings', category: 'UTILITY', rarity: 'God', cost: 9999, stats: { spd: 50 }, description: 'Flight modules.', voxelShapeType: 'WINGS_GOD', colorTheme: 'Gold' },
};

export const GACHA_POOLS = {
    STANDARD: { cost: 100, pool: ['part_leg_basic', 'part_arm_stubby', 'pixel_burger', 'potion_small'] },
    PREMIUM: { cost: 500, pool: ['part_ears_cat', 'part_halo', 'ancient_chip'] },
    GOD_MODE: { cost: 2000, pool: ['part_wings_god', 'nano_repair_kit', 'part_halo'] }
};

export const ITEMS_DB: Record<string, any> = {
    'pixel_pizza': { id: 'pixel_pizza', name: 'Glitch Pizza', type: 'Food', effect: { stat: 'hunger', val: 30 }, price: 50, rarity: 'Common', description: 'Restores 30 Hunger.' },
    'pixel_burger': { id: 'pixel_burger', name: 'Byte Burger', type: 'Food', effect: { stat: 'hunger', val: 50 }, price: 80, rarity: 'Common', description: 'Restores 50 Hunger.' },
    'potion_small': { id: 'potion_small', name: 'Data Tonic', type: 'Potion', effect: { stat: 'hp', val: 50 }, price: 100, rarity: 'Common', description: 'Restores 50 HP.' },
    'nano_repair_kit': { id: 'nano_repair_kit', name: 'Nano Kit', type: 'Consumable', effect: { stat: 'hp', val: 999 }, price: 1000, rarity: 'Mythic', description: 'Full Repair.' },
    'ancient_chip': { id: 'ancient_chip', name: 'Ancient Chip', type: 'Material', price: 500, rarity: 'Legendary', description: 'Rare relic.' },
    'unidentified_artifact': { id: 'unidentified_artifact', name: 'Artifact', type: 'Artifact', price: 5000, rarity: 'God', description: 'Needs Analysis.' },
};

export const MONSTER_DB: Record<string, any> = {
    'slime_v1': { speciesId: 'slime_v1', name: 'Slime', element: 'Toxic', stats: { hp: 40, atk: 10, def: 10, spd: 10 }, visualTraits: { 
        anatomy: { headShape: 'ROUND', bodyShape: 'ORB', limbStyle: 'NUBS', tailStyle: 'NONE', wingStyle: 'NONE', eyeStyle: 'ANIME_LARGE', primaryColor: '#10B981', secondaryColor: '#A7F3D0', accentColor: '#064E3B' },
        sculptParams: { roughness: 0.1, sharpness: 0.0 }
    }},
    'fire_wolf': { speciesId: 'fire_wolf', name: 'Fire Wolf', element: 'Fire', stats: { hp: 60, atk: 25, def: 15, spd: 30 }, visualTraits: { 
        anatomy: { headShape: 'WOLF', bodyShape: 'QUAD', limbStyle: 'PAWS', tailStyle: 'FOX', wingStyle: 'NONE', eyeStyle: 'GLOW_SLIT', primaryColor: '#EF4444', secondaryColor: '#FCA5A5', accentColor: '#7F1D1D', hasTail: true },
        sculptParams: { roughness: 0.8, sharpness: 0.5 }
    }},
};

export const LOCATIONS_DB: Record<string, any> = {
    'loc_starter': { id: 'loc_starter', name: 'Origin Grid', x: 50, y: 80, enemyTheme: ['Neutral'], color: 'bg-gray-400', environmentType: 'Grass' },
    'loc_forest': { id: 'loc_forest', name: 'Cache Jungle', x: 30, y: 60, enemyTheme: ['Grass'], color: 'bg-green-500', environmentType: 'Grass' },
    'loc_arcade': { id: 'loc_arcade', name: 'Neon Arcade', x: 70, y: 70, enemyTheme: ['Electric'], color: 'bg-pink-500', environmentType: 'City' },
};

export const ELEMENT_THEMES: Record<string, any> = {
    Fire: { color: 'text-red-500', bg: 'bg-red-500', icon: '🔥' },
    Water: { color: 'text-blue-500', bg: 'bg-blue-500', icon: '💧' },
    Grass: { color: 'text-green-500', bg: 'bg-green-500', icon: '🌿' },
    Electric: { color: 'text-yellow-400', bg: 'bg-yellow-400', icon: '⚡' },
    Neutral: { color: 'text-gray-500', bg: 'bg-gray-500', icon: '⚪' },
    Toxic: { color: 'text-purple-800', bg: 'bg-purple-800', icon: '☠️' },
    Metal: { color: 'text-gray-400', bg: 'bg-gray-400', icon: '⚙️' },
    Light: { color: 'text-yellow-200', bg: 'bg-yellow-200', icon: '✨' },
    Dark: { color: 'text-gray-800', bg: 'bg-gray-800', icon: '🌑' },
};

export const calculateStats = (pet: any) => {
    let { maxHp, atk, def, spd, int } = pet;
    if (pet.parts) {
        pet.parts.forEach((p:any) => {
            const partDef = PARTS_DB[p.partId]; 
            if(partDef && partDef.stats) {
                if(partDef.stats.hp) maxHp += partDef.stats.hp;
                if(partDef.stats.atk) atk += partDef.stats.atk;
                if(partDef.stats.def) def += partDef.stats.def; 
                if(partDef.stats.spd) spd += partDef.stats.spd;
            }
        });
    }
    return { maxHp, currentHp: pet.currentHp, atk, def, spd, int };
};

export const getRandomEnemy = (locId: string, playerLevel: number, voxelGen: any) => {
    const keys = Object.keys(MONSTER_DB);
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    const template = MONSTER_DB[randKey];
    const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
    
    return {
        id: `enemy_${Date.now()}`, name: template.name, element: template.element, level,
        hp: template.stats.hp * level, maxHp: template.stats.hp * level, currentHp: template.stats.hp * level,
        atk: template.stats.atk, def: template.stats.def, spd: template.stats.spd,
        voxelCode: voxelGen(template.element, template.visualTraits.anatomy.bodyShape, 'Noob', template.visualTraits, template.name),
        visualTraits: template.visualTraits
    };
};

export const getLootDrop = (locId: string) => {
    return Math.random() > 0.5 ? 'pixel_burger' : 'potion_small';
};

export const generateStarterOptions = () => [
    { 
        name: 'Ignis', element: 'Fire', bodyType: 'HUMANOID', description: 'Fiery fighter.', stats: { hp: 50, atk: 18, def: 12, spd: 14 }, 
        visualTraits: { 
            anatomy: { headShape: 'WOLF', bodyShape: 'HUMANOID', limbStyle: 'PAWS', tailStyle: 'FOX', wingStyle: 'NONE', eyeStyle: 'ANIME_LARGE', primaryColor: '#EF4444', secondaryColor: '#FCA5A5', accentColor: '#7F1D1D', hasTail: true },
            sculptParams: { roughness: 0.6, sharpness: 0.3 }
        } 
    },
    { 
        name: 'Aqua', element: 'Water', bodyType: 'FLOATING', description: 'Fluid defender.', stats: { hp: 60, atk: 14, def: 16, spd: 12 }, 
        visualTraits: { 
            anatomy: { headShape: 'ROUND', bodyShape: 'FLOATING', limbStyle: 'NUBS', tailStyle: 'FISH', wingStyle: 'NONE', eyeStyle: 'ANIME_LARGE', primaryColor: '#3B82F6', secondaryColor: '#93C5FD', accentColor: '#1E3A8A' },
            sculptParams: { roughness: 0.0, sharpness: 0.0 }
        } 
    },
    { 
        name: 'Terra', element: 'Grass', bodyType: 'QUAD', description: 'Sturdy tank.', stats: { hp: 70, atk: 15, def: 15, spd: 10 }, 
        visualTraits: { 
            anatomy: { headShape: 'SQUARE', bodyShape: 'QUAD', limbStyle: 'HOOVES', tailStyle: 'LIZARD', wingStyle: 'NONE', eyeStyle: 'DOTS', primaryColor: '#10B981', secondaryColor: '#6EE7B7', accentColor: '#064E3B' },
            sculptParams: { roughness: 0.2, sharpness: 0.8 }
        } 
    }
];

export const getActionFromText = (text: string) => {
    if (text.includes('COMBAT') || text.includes('BOSS')) return 'ATTACK';
    return 'IDLE';
};

export const getProceduralMonsterArt = (name: string, element: string) => {
    // Return a random placeholder since we don't have an image gen backend hooked up here for cards yet
    const seed = name.length + element.length;
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=${element === 'Fire' ? 'ffcccc' : element === 'Water' ? 'ccddff' : 'ccffcc'}`;
};
