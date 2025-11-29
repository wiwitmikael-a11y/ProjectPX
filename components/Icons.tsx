
import React from 'react';
import { GameItem } from '../services/gameData';

// --- VECTOR ICONS (NEO-POP STYLE) ---

export const IconCoin = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block mr-1">
        <circle cx="12" cy="12" r="10" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" fill="#F59E0B" stroke="black" strokeWidth="1" strokeDasharray="2 2" className="animate-[spin_10s_linear_infinite]"/>
        <path d="M10 8h4v8h-4z" fill="#FEF3C7" className="coin-shine"/>
    </svg>
);

export const IconBag = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M5 6h14v16H5zM8 2h8v4H8z" className="text-black stroke-black stroke-2" fill="none"/>
        <path d="M6 7h12v14H6z" fill="#A78BFA"/>
        <path d="M9 3h6v3H9z" fill="#7C3AED"/>
        <rect x="11" y="11" width="2" height="6" fill="white"/>
        <rect x="9" y="13" width="6" height="2" fill="white"/>
    </svg>
);

export const IconCart = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M2 4h4l3 12h12l2-10H6" stroke="black" strokeWidth="2" fill="none"/>
        <circle cx="9" cy="20" r="2" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <circle cx="19" cy="20" r="2" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <path d="M7 5h14l-1.5 9H8.5z" fill="#60A5FA"/>
    </svg>
);

export const IconMap = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" stroke="black" strokeWidth="2" fill="#34D399"/>
        <path d="M9 3v15M15 6v15" stroke="black" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
);

export const IconCards = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <rect x="4" y="6" width="12" height="16" rx="1" transform="rotate(-5 10 14)" fill="#F87171" stroke="black" strokeWidth="2"/>
        <rect x="8" y="4" width="12" height="16" rx="1" transform="rotate(5 14 12)" fill="#60A5FA" stroke="black" strokeWidth="2"/>
        <rect x="6" y="2" width="12" height="16" rx="1" fill="#FCD34D" stroke="black" strokeWidth="2"/>
    </svg>
);

export const IconBook = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" fill="#6366F1" stroke="black" strokeWidth="2"/>
        <path d="M8 4v16M16 4v16" stroke="black" strokeWidth="1" strokeDasharray="2 2"/>
        <circle cx="12" cy="12" r="3" fill="#4338CA" stroke="black" strokeWidth="1"/>
    </svg>
);

export const IconScan = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current">
        <path d="M3 7h4l2-3h6l2 3h4v14H3z" fill="#374151" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="13" r="4" fill="#60A5FA" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="13" r="2" fill="#1D4ED8"/>
        <rect x="18" y="9" width="2" height="1" fill="white"/>
    </svg>
);

export const IconSkull = () => (
    <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto animate-bounce">
        <path d="M4 8a8 8 0 1 1 16 0c0 4-2 6-4 7v2h-8v-2c-2-1-4-3-4-7z" fill="#EF4444" stroke="black" strokeWidth="2"/>
        <circle cx="9" cy="9" r="2" fill="black"/>
        <circle cx="15" cy="9" r="2" fill="black"/>
        <rect x="11" y="12" width="2" height="3" fill="black"/>
        <path d="M8 20h2v2H8zM14 20h2v2h-2z" fill="black"/>
    </svg>
);

export const IconTreasure = () => (
    <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto animate-bounce">
        <path d="M2 8h20l-2 12H4L2 8z" fill="#FBBF24" stroke="black" strokeWidth="2"/>
        <path d="M2 8l10-6 10 6H2z" fill="#FCD34D" stroke="black" strokeWidth="2"/>
        <rect x="11" y="10" width="2" height="4" fill="black" opacity="0.3"/>
        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
);

export const IconCapsule = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2a10 10 0 0 0-10 10v2a10 10 0 0 0 20 0v-2a10 10 0 0 0-10-10z" fill="#F472B6" stroke="black" strokeWidth="2"/>
        <path d="M2 12h20" stroke="black" strokeWidth="2"/>
        <circle cx="12" cy="12" r="3" fill="white" stroke="black" strokeWidth="2"/>
        <path d="M12 12v10" stroke="black" strokeWidth="2"/>
    </svg>
);

export const IconTrash = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="white" strokeWidth="2" fill="none"/>
    </svg>
);

export const IconWrench = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7Z" fill="#9CA3AF" stroke="black" strokeWidth="2"/>
        <path d="M19.5 3.5L20.5 4.5" stroke="black" strokeWidth="2"/>
        <path d="M13 9l-9 9a2 2 0 0 0 2 2l9-9" fill="#4B5563" stroke="black" strokeWidth="2"/>
    </svg>
);

// COMPREHENSIVE ITEM ICON LIBRARY WITH RARITY COLORS
const RARITY_COLORS: Record<string, string> = {
    Common: '#E5E7EB', // Gray
    Rare: '#60A5FA',   // Neon Blue
    Epic: '#A78BFA',   // Purple
    Legendary: '#FBBF24' // Gold
};

export const ItemIcon: React.FC<{ item: GameItem }> = ({ item }) => {
    const id = item.id.toLowerCase();
    const baseColor = RARITY_COLORS[item.rarity] || '#E5E7EB';
    const strokeColor = item.rarity === 'Legendary' ? '#B45309' : 'black';
    
    // PIZZA
    if (id.includes('pizza')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M12 2L2 20h20L12 2z" fill="#FCD34D" stroke={strokeColor} strokeWidth="2"/>
                <circle cx="12" cy="8" r="1.5" fill="#EF4444"/>
                <circle cx="10" cy="14" r="1.5" fill="#EF4444"/>
                <circle cx="15" cy="12" r="1.5" fill="#EF4444"/>
                <circle cx="13" cy="17" r="1.5" fill="#EF4444"/>
                <path d="M2 20h20v2H2z" fill="#D97706" stroke={strokeColor} strokeWidth="1"/>
            </svg>
        );
    }
    // BURGER / STEAK
    if (id.includes('burger') || id.includes('steak')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M4 9c0-4 4-6 8-6s8 2 8 6H4z" fill="#FBBF24" stroke={strokeColor} strokeWidth="2"/>
                <rect x="3" y="15" width="18" height="4" rx="2" fill="#7F1D1D" stroke={strokeColor} strokeWidth="2"/>
                <rect x="4" y="13" width="16" height="2" fill="#22C55E" stroke={strokeColor} strokeWidth="1"/>
                <path d="M4 19h16v3H4z" fill="#FBBF24" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // BOOTS
    if (id.includes('boots') || id.includes('shoe')) {
         return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                 <path d="M6 8h8v12H6z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                 <path d="M6 20h12v2H6z" fill="black" />
                 <rect x="14" y="16" width="4" height="4" fill="#FCD34D" stroke={strokeColor} />
                 <path d="M8 8v-2c0-2 2-3 4-3h2" stroke={strokeColor} strokeWidth="2" fill="none"/>
                 {item.rarity === 'Legendary' && <path d="M18 10l4-2-4-2" stroke="#FBBF24" strokeWidth="2"/>}
            </svg>
        );
    }
    // ARMOR / VEST
    if (id.includes('armor') || id.includes('vest')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M5 4h14v14l-7 4-7-4V4z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                <path d="M9 8h6" stroke={strokeColor} strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" fill="#3B82F6" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // DRINK - SODA/POTION
    if (id.includes('soda') || id.includes('potion')) {
        const liquidColor = id.includes('soda') ? '#60A5FA' : id.includes('super') ? '#A855F7' : '#EF4444';
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M9 3h6v4H9z" fill="#9CA3AF" stroke={strokeColor} strokeWidth="2"/>
                <path d="M7 7h10l2 13H5L7 7z" fill="#F3F4F6" stroke={strokeColor} strokeWidth="2"/>
                <path d="M8 10h8l1.5 9h-11L8 10z" fill={liquidColor}/>
                <rect x="11" y="11" width="2" height="6" fill="white" opacity="0.5"/>
            </svg>
        );
    }
    // CHIPS / DRIVERS / MATERIALS - MEMORY CHIP STYLE
    if (id.includes('chip') || id.includes('driver')) {
        let color = '#A78BFA';
        if (id.includes('fire') || id.includes('crimson')) color = '#EF4444';
        if (id.includes('water')) color = '#3B82F6';
        if (id.includes('grass')) color = '#10B981';
        if (id.includes('electric')) color = '#FBBF24';
        if (id.includes('metal')) color = '#94A3B8';
        if (id.includes('dark')) color = '#111827';
        
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                {/* Main Chip Body */}
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#1F2937" stroke={strokeColor} strokeWidth="2"/>
                {/* Inner Core */}
                <rect x="8" y="8" width="8" height="8" rx="1" fill={color}/>
                {/* Gold Pins */}
                <path d="M2 6h2 M2 9h2 M2 12h2 M2 15h2 M2 18h2" stroke="#FBBF24" strokeWidth="2" />
                <path d="M20 6h2 M20 9h2 M20 12h2 M20 15h2 M20 18h2" stroke="#FBBF24" strokeWidth="2" />
                {/* Circuit Lines */}
                <path d="M12 8v-2 M8 12H6 M16 12h2 M12 16v2" stroke="#4B5563" strokeWidth="1"/>
            </svg>
        );
    }
    // GEAR - HELMET / VISOR
    if (id.includes('helm') || id.includes('visor') || id.includes('crown')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path d="M4 13c0-5 4-9 8-9s8 4 8 9v6H4v-6z" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
                <rect x="7" y="10" width="10" height="4" fill={id.includes('visor') ? '#EF4444' : '#3B82F6'} stroke={strokeColor} strokeWidth="2"/>
                <path d="M12 4v4" stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    // ACCESSORY (Rings, Charms, Wings)
    if (id.includes('wings') || id.includes('ring') || id.includes('pack') || id.includes('charm') || id.includes('blush')) {
        return (
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                 <circle cx="12" cy="12" r="8" fill="none" stroke={baseColor} strokeWidth="3"/>
                 {id.includes('wings') && <path d="M2 12l8-4v8l-8-4zM22 12l-8-4v8l8-4z" fill={baseColor} stroke={strokeColor} />}
                 <circle cx="12" cy="12" r="4" fill={item.rarity === 'Legendary' ? '#FCD34D' : '#F472B6'} stroke={strokeColor} strokeWidth="2"/>
            </svg>
        );
    }
    
    // MYSTERY BOX / DEFAULT
    return (
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <rect x="4" y="4" width="16" height="16" rx="2" fill={baseColor} stroke={strokeColor} strokeWidth="2"/>
            <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="black">?</text>
        </svg>
    );
};
