
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

export interface ObjectArchetype {
    element?: string;
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
    int?: number;
}

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

export const OBJECT_ARCHETYPES: Record<string, ObjectArchetype> = {
    'LiquidContainer': { element: 'Water', def: 60, spd: 30 },
    'Electronics': { element: 'Electric', int: 80, spd: 70 },
    'Plant': { element: 'Grass', hp: 80, spd: 20 },
    'Food': { element: 'Toxic', hp: 100, atk: 20 },
    'Toy': { element: 'Psychic', spd: 60 },
    'Tool': { element: 'Metal', atk: 70, def: 50 },
    'LightSource': { element: 'Light', int: 70, atk: 60 },
    'Vehicle': { element: 'Metal', spd: 90, def: 60 },
    'Book': { element: 'Psychic', int: 100, atk: 10 },
    'Trash': { element: 'Dark', hp: 120, def: 80 }
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
        effect: (pet: any) => { pet.currentHp = Math.min(pet.maxHp, pet.currentHp + 20); return "Recovered 20 HP"; },
        icon: '💊', rarity: 'Common', price: 50
    },
    'energy_drink': {
        id: 'energy_drink', name: 'Voltage Drink', type: 'Consumable',
        description: 'Restores 50 Fatigue.',
        effect: (pet: any) => { pet.fatigue = Math.max(0, pet.fatigue - 50); return "Pet feels energized!"; },
        icon: '⚡', rarity: 'Common', price: 75
    },
    'chip_attack': {
        id: 'chip_attack', name: 'ATK Chip', type: 'Consumable',
        description: 'Permanently grants +5 ATK.',
        effect: (pet: any) => { pet.atk += 5; return "ATK Up!"; },
        icon: '💾', rarity: 'Rare', price: 200
    }
};

export const ENEMIES_DB: Record<string, WildEnemyBlueprint> = {
    'GlitchSlime': {
        name: 'Glitch Slime', element: 'Toxic',
        baseHp: 30, baseAtk: 15, baseDef: 10, baseSpd: 10,
        description: 'A blob of corrupted data.',
        visualPrompt: 'A green slime blob with glitch artifacts', minRank: 'E'
    },
    'RogueDrone': {
        name: 'Rogue Drone', element: 'Metal',
        baseHp: 40, baseAtk: 25, baseDef: 20, baseSpd: 30,
        description: 'A malfunctioning surveillance drone.',
        visualPrompt: 'A small flying drone with a red eye', minRank: 'D'
    },
    'FireWall': {
        name: 'Living Firewall', element: 'Fire',
        baseHp: 60, baseAtk: 30, baseDef: 40, baseSpd: 10,
        description: 'Security software gone rogue.',
        visualPrompt: 'A brick wall monster with fire limbs', minRank: 'C'
    }
};

export const getRandomEnemy = (rank: string, playerLevel: number) => {
    const enemies = Object.values(ENEMIES_DB);
    const blueprint = enemies[Math.floor(Math.random() * enemies.length)];
    const scale = playerLevel * 0.8; 
    
    // Return a complete object compatible with Pixupet type
    return {
        id: `wild_${Date.now()}`,
        name: blueprint.name,
        element: blueprint.element as any,
        rarity: 'Common' as const,
        stage: 'Rookie' as const,
        rank: 'E' as const,
        nature: "Wild", 
        personality: "Wild", 
        visual_design: blueprint.visualPrompt, 
        potential: 0,
        hp: Math.floor(blueprint.baseHp * scale),
        atk: Math.floor(blueprint.baseAtk * scale),
        def: Math.floor(blueprint.baseDef * scale),
        spd: Math.floor(blueprint.baseSpd * scale),
        int: 10,
        description: blueprint.description,
        ability: "Wild",
        moves: [],
        level: playerLevel,
        exp: 10, maxExp: 100, hunger: 100, fatigue: 0,
        imageSource: '',
        cardArtUrl: '',
        currentHp: Math.floor(blueprint.baseHp * scale),
        maxHp: Math.floor(blueprint.baseHp * scale),
        voxelCode: '', // Will be filled by getGenericVoxel later
        dateCreated: Date.now()
    };
};

export const getLootDrop = (enemyRank: string) => {
    if (Math.random() > 0.5) return null;
    const items = Object.values(ITEMS_DB);
    return items[Math.floor(Math.random() * items.length)];
};
