
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BodyType = 'BIPED' | 'QUADRUPED' | 'FLOATING' | 'WHEELED' | 'SERPENTINE';
export type AITactic = 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE' | 'SPEEDSTER';
export type WeatherType = 'CLEAR' | 'RAIN' | 'STORM' | 'NEON_MIST';

export interface GameItem {
    id: string;
    name: string;
    type: 'Consumable' | 'Material' | 'Key';
    description: string;
    effect?: (pet: any) => any;
    icon: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    price: number;
}

export interface WildEnemyBlueprint {
    name: string;
    element: string;
    baseHp: number;
    baseAtk: number;
    baseDef: number;
    baseSpd: number;
    description: string;
    visualPrompt: string;
    minRank: string;
    bodyType: BodyType;
}

export interface ObjectArchetype {
    element?: string;
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
    int?: number;
    defaultBodyType?: BodyType;
}

export const TACTIC_MULTIPLIERS: Record<AITactic, { atk: number, def: number, spd: number, crit: number }> = {
    BALANCED: { atk: 1.0, def: 1.0, spd: 1.0, crit: 0.05 },
    AGGRESSIVE: { atk: 1.4, def: 0.6, spd: 1.1, crit: 0.20 },
    DEFENSIVE: { atk: 0.7, def: 1.5, spd: 0.8, crit: 0.02 },
    SPEEDSTER: { atk: 1.1, def: 0.8, spd: 1.5, crit: 0.15 }
};

export const WEATHER_MULTIPLIERS: Record<WeatherType, Record<string, number>> = {
    CLEAR: { Fire: 1.2, Grass: 1.2, Light: 1.2, Dark: 0.8 },
    RAIN: { Water: 1.5, Electric: 1.2, Fire: 0.7, Metal: 0.9 },
    STORM: { Electric: 1.5, Metal: 1.3, Water: 1.2, Flying: 0.8 },
    NEON_MIST: { Psychic: 1.4, Spirit: 1.4, Dark: 1.3, Light: 0.8, Toxic: 1.3 }
};

export const ELEMENT_CHART: Record<string, Record<string, number>> = {
    Fire: { Grass: 2, Metal: 2, Water: 0.5, Fire: 0.5 },
    Water: { Fire: 2, Metal: 2, Grass: 0.5, Water: 0.5 },
    Grass: { Water: 2, Electric: 2, Fire: 0.5, Grass: 0.5, Toxic: 0.5 },
    Electric: { Water: 2, Metal: 2, Grass: 0.5, Electric: 0.5 },
    Psychic: { Toxic: 2, Dark: 0.5, Metal: 0.5 },
    Metal: { Grass: 2, Psychic: 2, Fire: 0.5, Electric: 0.5 },
    Dark: { Psychic: 2, Spirit: 2, Dark: 0.5 },
    Light: { Dark: 2, Spirit: 2, Light: 0.5 },
    Spirit: { Psychic: 2, Light: 0.5, Spirit: 2 },
    Toxic: { Grass: 2, Metal: 0.5, Toxic: 0.5 }
};

// Neo-Pop Biome Palettes for Voxel Generation
export const BIOME_DEFINITIONS: Record<string, { ground: string, accent: string, sky: string, detail: string }> = {
    Fire: { ground: '0x330000', accent: '0xFF4500', sky: '0xFFAA00', detail: 'Obsidian/Lava' },
    Water: { ground: '0x006994', accent: '0x00BFFF', sky: '0xE0F7FA', detail: 'Sand/Water' },
    Grass: { ground: '0x4CAF50', accent: '0x8BC34A', sky: '0x87CEEB', detail: 'Flowers/Trees' },
    Electric: { ground: '0x212121', accent: '0xFFEB3B', sky: '0x424242', detail: 'Metal Tiles' },
    Psychic: { ground: '0x4A148C', accent: '0xEA80FC', sky: '0xF3E5F5', detail: 'Crystals' },
    Metal: { ground: '0x607D8B', accent: '0xB0BEC5', sky: '0xECEFF1', detail: 'Factory Floor' },
    Dark: { ground: '0x000000', accent: '0x6A1B9A', sky: '0x311B92', detail: 'Grave Soil' },
    Light: { ground: '0xFFFFFF', accent: '0xFFD700', sky: '0xFFFDE7', detail: 'Gold Tiles' },
    Spirit: { ground: '0x283593', accent: '0x00E5FF', sky: '0xE8EAF6', detail: 'Mist' },
    Toxic: { ground: '0x1B5E20', accent: '0x76FF03', sky: '0xF1F8E9', detail: 'Sludge' }
};

export const OBJECT_ARCHETYPES: Record<string, ObjectArchetype> = {
    'LiquidContainer': { element: 'Water', def: 60, spd: 30, defaultBodyType: 'FLOATING' },
    'Electronics': { element: 'Electric', int: 80, spd: 70, defaultBodyType: 'BIPED' },
    'Plant': { element: 'Grass', hp: 80, spd: 20, defaultBodyType: 'QUADRUPED' },
    'Food': { element: 'Toxic', hp: 100, atk: 20, defaultBodyType: 'FLOATING' },
    'Toy': { element: 'Psychic', spd: 60, defaultBodyType: 'BIPED' },
    'Tool': { element: 'Metal', atk: 70, def: 50, defaultBodyType: 'BIPED' },
    'LightSource': { element: 'Light', int: 70, atk: 60, defaultBodyType: 'FLOATING' },
    'Vehicle': { element: 'Metal', spd: 90, def: 60, defaultBodyType: 'WHEELED' },
    'Book': { element: 'Psychic', int: 100, atk: 10, defaultBodyType: 'FLOATING' },
    'Trash': { element: 'Dark', hp: 120, def: 80, defaultBodyType: 'FLOATING' }
};

export const SKILL_DATABASE = [
    { name: "Tackle", type: "Physical", power: 40, accuracy: 100, description: "A standard charge attack." },
    { name: "Ember", type: "Special", power: 40, accuracy: 100, description: "Small flame attack." },
    { name: "Water Gun", type: "Special", power: 40, accuracy: 100, description: "Squirts water." },
    { name: "Leafage", type: "Physical", power: 40, accuracy: 100, description: "Throws leaves." },
    { name: "Spark", type: "Physical", power: 65, accuracy: 100, description: "Electrified tackle." },
    { name: "Confusion", type: "Special", power: 50, accuracy: 100, description: "Psychic wave." },
    { name: "Metal Claw", type: "Physical", power: 50, accuracy: 95, description: "Steel slash." },
    { name: "Bite", type: "Physical", power: 60, accuracy: 100, description: "Dark energy bite." }
];

export const ITEMS_DB: Record<string, GameItem> = {
    'potion_small': {
        id: 'potion_small', name: 'Mini Data Pack', type: 'Consumable',
        description: 'Restores 20 HP.',
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 20); return pet; },
        icon: '❤️', rarity: 'Common', price: 50
    },
    'energy_drink': {
        id: 'energy_drink', name: 'Voltage Cola', type: 'Consumable',
        description: 'Restores 50 Fatigue.',
        effect: (pet: any) => { pet.fatigue = Math.max(0, pet.fatigue - 50); return pet; },
        icon: '⚡', rarity: 'Common', price: 100
    }
};

export const getRandomEnemy = (rank: string, playerLevel: number): any => {
    const elements = Object.keys(ELEMENT_CHART);
    const element = elements[Math.floor(Math.random() * elements.length)];
    const types: BodyType[] = ['BIPED', 'QUADRUPED', 'FLOATING', 'WHEELED'];
    const bodyType = types[Math.floor(Math.random() * types.length)];
    
    return {
        id: `wild_${Date.now()}`,
        name: `Glitch ${element}`,
        element,
        rarity: 'Common',
        stage: 'Rookie',
        rank: 'E',
        nature: 'Wild',
        personality: 'Aggressive',
        visual_design: `A corrupted data entity made of ${element} energy. Body type: ${bodyType}.`,
        potential: 1,
        hp: 80 + playerLevel * 10,
        maxHp: 80 + playerLevel * 10,
        atk: 20 + playerLevel * 2,
        def: 20 + playerLevel * 2,
        spd: 20 + playerLevel * 2,
        int: 10,
        description: "A wild data anomaly.",
        ability: "Glitch",
        moves: [],
        bodyType,
        tactic: 'AGGRESSIVE'
    };
};

export const getLootDrop = (rank: string): string | null => {
    if (Math.random() > 0.7) return 'potion_small';
    return null;
};
