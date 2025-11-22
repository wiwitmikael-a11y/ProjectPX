
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { VisualTraits, MonsterStage } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image using the most advanced Gemini model (gemini-3-pro-preview)
 * to extract deep "Visual DNA" for AAA character generation.
 */
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        // Use the requested high-tier model string
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    {
                        text: `You are a "Digital Sculptor" for a AAA monster taming game. 
                        Analyze this image with extreme precision to extract its "Visual DNA" for a 3D voxel generator.
                        
                        Look for:
                        1. Material properties (Is it shiny plastic? Matte fur? Glowing/Emissive parts?).
                        2. Structural details (Does it have distinct limbs, floating parts, armor plates, nozzle jets?).
                        3. Dominant colors (Extract exact hex codes).
                        4. PRIMARY SHAPE: Is the main body mostly Round (Sphere), Slender (Cylinder/Tall), or Chunky (Box/Cube)?
                        5. SPECIAL FEATURES: Note any glowing parts, flames, or unique accessories.
                        
                        STRICTLY RETURN JSON ONLY. No markdown blocks.
                        
                        JSON Structure:
                        {
                            "name": "Creative Name",
                            "element": "Fire" | "Water" | "Grass" | "Electric" | "Psychic" | "Metal" | "Dark" | "Light" | "Spirit" | "Toxic",
                            "hp": number (80-150),
                            "atk": number (20-60),
                            "def": number (20-60),
                            "spd": number (20-60),
                            "description": "Witty, high-quality lore description.",
                            "bodyType": "BIPED" | "QUADRUPED" | "FLOATING",
                            "visual_design": "Detailed description of the form.",
                            "visualTraits": {
                                "hasHorns": boolean,
                                "hornStyle": "Uni" | "Dual" | "Antenna" | "None",
                                "hasWings": boolean,
                                "wingStyle": "Feather" | "Bat" | "Mech" | "None",
                                "accessory": "Goggles" | "Scarf" | "Helmet" | "Backpack" | "None",
                                "build": "Chunky" | "Slender" | "Round",
                                "hasEars": boolean,
                                "surfaceFinish": "Matte" | "Glossy" | "Metallic" | "Emissive",
                                "materialType": "Standard" | "Magma" | "Jelly" | "Moss",
                                "tailStyle": "Segmented" | "Smooth" | "None",
                                "legJointStyle": "Digitigrade" | "Plantigrade",
                                "spineCurve": "Straight" | "Hunched",
                                "specialFeature": "ThrusterFlames" | "GlowingEyes" | "None",
                                "extractedColors": {
                                    "primary": "Hex Code",
                                    "secondary": "Hex Code",
                                    "accent": "Hex Code"
                                }
                            }
                        }`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Analysis failed", error);
        return {
            name: "Glitch Entity",
            element: "Neutral",
            hp: 60, atk: 20, def: 20, spd: 20,
            description: "An anomaly in the scanner.",
            bodyType: "FLOATING",
            visual_design: "Unknown form.",
            visualTraits: { 
                hasHorns: false, hasWings: false, 
                build: 'Round', accessory: 'None', hasEars: false, 
                surfaceFinish: 'Matte', materialType: 'Standard',
                specialFeature: 'None',
                extractedColors: { primary: '#CBD5E1', secondary: '#F1F5F9', accent: '#333333' } 
            }
        };
    }
};

/**
 * Generates the AAA Voxel Engine HTML string using PBR, Advanced Materials (Magma/Jelly/Moss), and composite modeling.
 */
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob', visualTraits?: VisualTraits, name?: string): string => {
    
    const dna = visualTraits || { 
        hasHorns: false, hasWings: false, 
        build: 'Chunky', accessory: 'None', hasEars: false, 
        surfaceFinish: 'Matte', materialType: 'Standard',
        specialFeature: 'None',
        extractedColors: { primary: '#CBD5E1', secondary: '#F1F5F9', accent: '#333333' } 
    };

    const pCol = dna.extractedColors?.primary ? parseInt(dna.extractedColors.primary.replace('#', '0x'), 16) : 0xCBD5E1;
    const sCol = dna.extractedColors?.secondary ? parseInt(dna.extractedColors.secondary.replace('#', '0x'), 16) : 0xFFFFFF;
    const aCol = dna.extractedColors?.accent ? parseInt(dna.extractedColors.accent.replace('#', '0x'), 16) : 0x333333;

    const scale = stage === 'Legend' ? 2.4 : stage === 'Elite' ? 1.8 : stage === 'Pro' ? 1.4 : 1.0;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent !important; }
    canvas { display: block; width: 100% !important; height: 100% !important; outline: none; touch-action: none; }
</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// --- AAA SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xD1FAE5); 
scene.fog = new THREE.FogExp2(0xD1FAE5, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(5, 4, 12); 

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: "high-performance"});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

renderer.render(scene, camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05; 
controls.minDistance = 4;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2 - 0.1; 
controls.target.set(0, 1.5, 0);
controls.enableRotate = true;

// --- LIGHTING ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); 
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024; 
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(-5, 5, -10); 
scene.add(rimLight);

// --- ADVANCED MATERIAL FACTORY ---
function boostColor(hex) {
    const c = new THREE.Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    hsl.s = Math.max(0.8, hsl.s); // Force High Saturation for Pop Look
    hsl.l = Math.max(0.4, Math.min(0.8, hsl.l)); // Avoid too dark/bright
    c.setHSL(hsl.h, hsl.s, hsl.l);
    return c.getHex();
}

function createStandardMat(col, r = 0.4, m = 0.1) {
    return new THREE.MeshStandardMaterial({ color: boostColor(col), roughness: r, metalness: m });
}

// MAGMA PULSE SHADER
function createLavaMat(colorHex) {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: boostColor(colorHex),
        emissiveIntensity: 2.0,
        roughness: 0.4,
        metalness: 0.5
    });
    
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.time = uniforms.time;
        shader.fragmentShader = \`
            uniform float time;
        \` + shader.fragmentShader;
        
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            \`
            float pulse = sin(time * 4.0) * 0.5 + 0.5;
            diffuseColor.rgb += emissive * (0.2 + pulse * 0.8);
            \`
        );
    };
    return mat;
}

// JELLY WOBBLE SHADER (With internal refraction hint)
function createJellyMat(colorHex) {
    const mat = new THREE.MeshPhysicalMaterial({
        color: boostColor(colorHex),
        transmission: 0.8, 
        opacity: 1.0,
        metalness: 0.1,
        roughness: 0.15,
        ior: 1.4,
        thickness: 1.5,
        transparent: true,
        side: THREE.DoubleSide
    });
    return mat;
}

// MOSS NOISE SHADER
function createMossMat(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const col = new THREE.Color(boostColor(baseColor));
    ctx.fillStyle = '#' + col.getHexString();
    ctx.fillRect(0,0,128,128);
    
    // Noise pattern
    for(let i=0; i<800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
        const s = Math.random() * 4;
        ctx.fillRect(Math.random()*128, Math.random()*128, s, s);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0, metalness: 0.0 });
}

const uniforms = { time: { value: 0 } };

const primMat = createStandardMat(${pCol});
const secMat = createStandardMat(${sCol});
const accMat = createStandardMat(${aCol}, 0.3, 0.8); 
const darkMat = createStandardMat(0x222222);
const goldMat = createStandardMat(0xFFD700, 0.3, 0.8);
const woodMat = createStandardMat(0x8D6E63, 0.9, 0.0);
const rockMat = createStandardMat(0x888888, 0.8, 0.0);
const crystalMat = createLavaMat(0xff00ff);
const leafMat = createStandardMat(0x6BCB77, 0.8, 0.0);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x88CCFF, transmission: 0.9, roughness: 0.0, transparent: true, thickness: 0.5 });

// Specific Starter Materials
const magmaMat = createLavaMat(0xFF4500); 
const jellyMat = createJellyMat(0xF97316); // Orange Jelly for Pyro
const blueJellyMat = createJellyMat(0x3B82F6); // Blue Jelly for Fizz
const mossMat = createMossMat(0x166534);   

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const OUTLINE_THICKNESS = 1.02; 

function addOutline(mesh) {
    const outline = new THREE.Mesh(mesh.geometry, outlineMat); 
    outline.scale.setScalar(OUTLINE_THICKNESS);
    mesh.add(outline);
}

function createMesh(geo, mat, parent, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    addOutline(m);
    return m;
}

function createLimbGroup(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    // Add hidden joint sphere for smoothing transitions
    createMesh(new THREE.SphereGeometry(0.18, 16, 16), darkMat, g, 0, 0, 0);
    parent.add(g);
    return g;
}

function addArmorPlate(parent, x, y, z, w, h, d, color) {
    const g = new RoundedBoxGeometry(w, h, d, 2, 0.02);
    createMesh(g, color, parent, x, y, z);
}

function addGreebles(parent) {
    if (Math.random() > 0.5) {
        const ventG = new RoundedBoxGeometry(0.3, 0.05, 0.05, 1, 0.01);
        createMesh(ventG, darkMat, parent, 0, 0.2, 0.51);
        createMesh(ventG, darkMat, parent, 0, 0.0, 0.51);
        createMesh(ventG, darkMat, parent, 0, -0.2, 0.51);
    }
}

// --- TERRAIN LOGIC ---
function getTerrainHeight(x, z) {
    return Math.sin(x * 0.08) * 1.2 + Math.cos(z * 0.08) * 1.2 - 2.0;
}

function createGroundTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256; 
    const ctx = canvas.getContext('2d');
    const baseCol = new THREE.Color(boostColor(hexColor));
    ctx.fillStyle = '#' + baseCol.getHexString();
    ctx.fillRect(0,0,256,256);
    for(let i=0; i<500; i++) {
        const shade = Math.random() > 0.5 ? 0.95 : 1.05; 
        const col = baseCol.clone().multiplyScalar(shade);
        ctx.fillStyle = '#' + col.getHexString();
        const x = Math.floor(Math.random()*32)*8;
        const y = Math.floor(Math.random()*32)*8;
        ctx.fillRect(x,y,8,8);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10); 
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// --- CHUNK SYSTEM ---
const CHUNK_SIZE = 60;
const activeChunks = [];
let currentThemeColor = 0x6BCB77;

class TerrainChunk {
    constructor(zStart) {
        this.zStart = zStart;
        const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 16, 16); 
        const pos = geo.attributes.position;
        
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i); 
            const worldX = x;
            const worldZ = zStart - y; 
            
            const h = getTerrainHeight(worldX, worldZ);
            pos.setZ(i, h); 
        }
        geo.computeVertexNormals();
        
        const mat = new THREE.MeshStandardMaterial({ map: createGroundTexture(currentThemeColor), roughness: 1.0 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0, zStart);
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        this.props = [];
        this.populateProps();
    }
    
    populateProps() {
        const count = 8; 
        for(let i=0; i<count; i++) {
            const x = (Math.random() - 0.5) * (CHUNK_SIZE - 4);
            const zRel = (Math.random() - 0.5) * (CHUNK_SIZE - 4);
            const z = this.zStart - zRel;
            if (Math.abs(x) < 4) continue; 
            const fn = currentBiomeFuncs[Math.floor(Math.random()*currentBiomeFuncs.length)];
            const propList = fn(x, z);
            propList.forEach(p => this.props.push(p));
        }
    }
    
    destroy() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.props.forEach(p => scene.remove(p));
    }
}

// --- CHARACTER ASSEMBLY ---
const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

const bodyType = '${bodyType}';
const dna = ${JSON.stringify(dna)};
const charName = "${name || ''}";

// Common Geometries
let bodyGeo, headGeo;

if (dna.build === 'Round') {
    bodyGeo = new THREE.IcosahedronGeometry(0.6, 1);
    headGeo = new THREE.IcosahedronGeometry(0.5, 1);
} else if (dna.build === 'Slender') {
    bodyGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.0, 8);
    headGeo = new THREE.SphereGeometry(0.4, 12, 12);
} else {
    bodyGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.1);
    headGeo = new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.1);
}

const limbGeo = new RoundedBoxGeometry(0.25, 0.6, 0.25, 2, 0.05);
const jointGeo = new THREE.SphereGeometry(0.18, 16, 16);

const animatedParts = { legs: [], arms: [], body: null, special: [], tail: [] };
let headGroup, torso, headSlot, backSlot, accSlot;

// --- BESPOKE V2 SCULPTOR BUILDERS (COMPOSITE MODELING) ---

function buildPyro() {
    // PYRO-BIT V2: High Fidelity Toaster-Fox
    
    // 1. Body (Glass Chassis)
    const bodyShape = new RoundedBoxGeometry(1.0, 0.9, 1.5, 4, 0.15);
    torso = createMesh(bodyShape, jellyMat, charGroup, 0, 0.7, 0);
    animatedParts.body = torso;

    // 2. INTERNAL SKELETON (Detailed Ribs)
    const spine = createMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), createStandardMat(0xFFFFFF), torso, 0, 0.1, 0);
    spine.rotation.x = Math.PI/2;
    
    for(let i=0; i<6; i++) {
        const ribGeo = new THREE.TorusGeometry(0.38, 0.02, 6, 16); // High-res thin ribs
        const rib = createMesh(ribGeo, magmaMat, torso, 0, 0, -0.5 + i*0.2);
        rib.rotation.y = Math.PI / 2;
        animatedParts.special.push({ mesh: rib, type: 'pulse' });
    }

    // 3. HEAD (Layered Console)
    headGroup = new THREE.Group(); headGroup.position.set(0, 0.6, 0.9); torso.add(headGroup);
    createMesh(new THREE.SphereGeometry(0.4), darkMat, torso, 0, 0.5, 0.8); // Joint

    // Main Head Block
    const headBox = createMesh(new RoundedBoxGeometry(0.9, 0.75, 0.6, 4, 0.1), jellyMat, headGroup, 0, 0, 0);
    // Ear Cups (Side Detail)
    createMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 32), darkMat, headGroup, 0.46, 0, 0).rotation.z = Math.PI/2;
    createMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 32), darkMat, headGroup, -0.46, 0, 0).rotation.z = Math.PI/2;
    
    // Face Screen Bezel
    const screenFrame = createMesh(new RoundedBoxGeometry(0.8, 0.55, 0.1, 2, 0.02), createStandardMat(0xEEEEEE), headGroup, 0, 0, 0.28);
    const screenFace = createMesh(new THREE.PlaneGeometry(0.7, 0.45), darkMat, screenFrame, 0, 0, 0.06);
    // Pixel Eyes (Emissive Planes)
    createMesh(new THREE.PlaneGeometry(0.2, 0.25), magmaMat, screenFace, 0.2, 0.05, 0.01);
    createMesh(new THREE.PlaneGeometry(0.2, 0.25), magmaMat, screenFace, -0.2, 0.05, 0.01);
    // Snout
    createMesh(new RoundedBoxGeometry(0.3, 0.2, 0.2, 2, 0.05), createStandardMat(0xFFFFFF), headGroup, 0, -0.2, 0.35);
    createMesh(new THREE.SphereGeometry(0.08), darkMat, headGroup, 0, -0.15, 0.45);

    // Ears (Twitching)
    const earShape = new THREE.ConeGeometry(0.3, 0.8, 4);
    const e1Group = new THREE.Group(); e1Group.position.set(0.45, 0.6, -0.1); headGroup.add(e1Group);
    const e1 = createMesh(earShape, jellyMat, e1Group, 0, 0, 0); 
    e1.rotation.z = -0.4; e1.rotation.y = 0.2; e1.rotation.x = -0.2;
    animatedParts.special.push({ mesh: e1Group, type: 'twitch' });

    const e2Group = new THREE.Group(); e2Group.position.set(-0.45, 0.6, -0.1); headGroup.add(e2Group);
    const e2 = createMesh(earShape, jellyMat, e2Group, 0, 0, 0); 
    e2.rotation.z = 0.4; e2.rotation.y = -0.2; e2.rotation.x = -0.2;
    animatedParts.special.push({ mesh: e2Group, type: 'twitch' });

    // 4. TAIL (Flexible Braided Cord)
    const tailRoot = createLimbGroup(torso, 0, 0.2, -0.8);
    const braidCount = 22;
    let lastSeg = tailRoot;
    
    for(let i=0; i<braidCount; i++) {
        const segGroup = new THREE.Group();
        segGroup.position.set(0, 0.07, 0); // Stack upwards initially
        lastSeg.add(segGroup);
        
        const segGeo = new THREE.TorusGeometry(0.07, 0.035, 8, 12);
        const seg = createMesh(segGeo, darkMat, segGroup, 0, 0, 0);
        seg.rotation.x = Math.PI/2; 
        seg.rotation.z = i % 2 === 0 ? 0.9 : -0.9; // Twist
        
        animatedParts.tail.push(segGroup); // Store segments for wave animation
        lastSeg = segGroup;
    }
    
    // Spark Plug Tip
    const plugBase = createMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 6), createStandardMat(0xCCCCCC), lastSeg, 0, 0.15, 0); 
    createMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.25), createStandardMat(0xFFFFFF), plugBase, 0, 0.2, 0); 
    createMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15), darkMat, plugBase, 0, 0.4, 0); 
    // Fire Particle Emitter
    const fireEmitter = createMesh(new THREE.IcosahedronGeometry(0.15, 0), magmaMat, plugBase, 0, 0.5, 0);
    animatedParts.special.push({ mesh: fireEmitter, type: 'pulse_fire' }); // Emit particles

    // 5. LEGS
    const legPositions = [[0.35, -0.4, 0.5], [-0.35, -0.4, 0.5], [0.35, -0.4, -0.5], [-0.35, -0.4, -0.5]];
    legPositions.forEach((p, i) => {
        const group = createLimbGroup(torso, p[0], -0.1, p[2]);
        const l = createMesh(new THREE.CylinderGeometry(0.15, 0.12, 0.65, 12), jellyMat, group, 0, -0.3, 0);
        createMesh(new RoundedBoxGeometry(0.24, 0.15, 0.3, 2, 0.05), darkMat, l, 0, -0.3, 0.05); // Boot
        animatedParts.legs.push({ mesh: group, baseZ: p[2], phase: i%2===0 ? 0 : Math.PI });
    });

    headSlot = new THREE.Group(); headGroup.add(headSlot); headSlot.position.y = 0.5;
    backSlot = new THREE.Group(); torso.add(backSlot); backSlot.position.y = 0.5;
    accSlot = new THREE.Group(); torso.add(accSlot); accSlot.position.x = 0.6;
}

function buildFizz() {
    // FIZZ-BOT V2: Detailed Mech Assembly
    
    // 1. Body (Cup Assembly)
    const cupGeo = new THREE.CylinderGeometry(0.75, 0.65, 1.4, 32);
    torso = createMesh(cupGeo, glassMat, charGroup, 0, 1.2, 0);
    animatedParts.body = torso;
    
    // Lid
    createMesh(new THREE.TorusGeometry(0.78, 0.06, 12, 32), createStandardMat(0xEC4899), torso, 0, 0.7, 0).rotation.x = Math.PI/2;
    createMesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 32), createStandardMat(0xEC4899), torso, 0, 0.7, 0);

    // Liquid
    createMesh(new THREE.CylinderGeometry(0.7, 0.6, 1.1, 24), blueJellyMat, torso, 0, -0.1, 0);

    // 2. PILOT (Axolotl) - Floating
    const axoGroup = new THREE.Group(); 
    torso.add(axoGroup);
    const axoBody = createMesh(new THREE.IcosahedronGeometry(0.35, 2), createStandardMat(0xF472B6), axoGroup, 0, 0, 0);
    animatedParts.special.push({ mesh: axoGroup, type: 'bob' }); // Pilot bobs inside

    // Gills
    const gillMat = createStandardMat(0xEC4899);
    for(let i=-1; i<=1; i++) {
        createMesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), gillMat, axoBody, 0.35, i*0.1, 0).rotation.z = -0.2;
        createMesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), gillMat, axoBody, -0.35, i*0.1, 0).rotation.z = 0.2;
    }
    createMesh(new THREE.BoxGeometry(0.05, 0.35, 0.4), gillMat, axoBody, 0, 0, -0.35); // Fin
    createMesh(new THREE.PlaneGeometry(0.06, 0.06), darkMat, axoBody, 0.12, 0, 0.32);
    createMesh(new THREE.PlaneGeometry(0.06, 0.06), darkMat, axoBody, -0.12, 0, 0.32);
    createMesh(new THREE.PlaneGeometry(0.1, 0.02), darkMat, axoBody, 0, -0.1, 0.32);

    // Bubbles (Floating Up)
    for(let i=0; i<15; i++) {
        const bub = createMesh(new THREE.SphereGeometry(0.07, 8, 8), darkMat, torso, (Math.random()-0.5)*0.9, -0.5 + Math.random()*0.3, (Math.random()-0.5)*0.9);
        animatedParts.special.push({ mesh: bub, type: 'bubble', startY: bub.position.y, speed: 0.05 + Math.random()*0.1 });
    }

    // 3. COMPLEX LEGS (Piston + Tank + Nozzle)
    createMesh(new THREE.CylinderGeometry(0.6, 0.5, 0.2, 24), createStandardMat(0xEC4899), torso, 0, -0.8, 0); // Base
    
    for(let i=0; i<4; i++) {
        const angle = (i/4) * Math.PI * 2 + (Math.PI/4);
        const x = Math.cos(angle) * 0.75;
        const z = Math.sin(angle) * 0.75;
        const g = createLimbGroup(torso, x, -0.6, z);
        
        const tank = createMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16), createStandardMat(0x06B6D4), g, 0, -0.4, 0);
        createMesh(new THREE.TorusGeometry(0.15, 0.02, 8, 16), createStandardMat(0xFFFFFF), tank, 0, 0.15, 0).rotation.x = Math.PI/2;
        createMesh(new THREE.TorusGeometry(0.15, 0.02, 8, 16), createStandardMat(0xFFFFFF), tank, 0, -0.15, 0).rotation.x = Math.PI/2;
        
        const nozzle = createMesh(new THREE.ConeGeometry(0.12, 0.2, 16), darkMat, tank, 0, -0.35, 0);
        const flame = createMesh(new THREE.ConeGeometry(0.08, 0.35, 8), magmaMat, nozzle, 0, -0.25, 0);
        flame.rotation.x = Math.PI;
        
        animatedParts.special.push({ mesh: g, type: 'bob_limb', offset: i }); // Independent bobbing
        animatedParts.special.push({ mesh: flame, type: 'thruster_flame' }); // Flame particles
    }

    // Straw
    const strawPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.2, 0.8, 0)
    ]);
    const strawTube = new THREE.TubeGeometry(strawPath, 10, 0.12, 16, false);
    const strawMesh = createMesh(strawTube, createStandardMat(0xFFFFFF), torso, 0.5, 0.8, -0.2);
    strawMesh.rotation.z = -0.3;
    animatedParts.special.push({ mesh: strawMesh, type: 'bob_straw' });

    headSlot = new THREE.Group(); torso.add(headSlot); headSlot.position.y = 0.8;
    backSlot = new THREE.Group(); torso.add(backSlot); backSlot.position.z = -0.6;
    accSlot = new THREE.Group(); torso.add(accSlot); accSlot.position.x = 0.7;
}

function buildMoss() {
    // MOSS-AMP V2: High Fidelity Boombox Frog
    torso = createMesh(new RoundedBoxGeometry(1.6, 1.2, 1.8, 4, 0.3), createStandardMat(0x4ADE80), charGroup, 0, 0.6, 0);
    animatedParts.body = torso;
    
    headGroup = new THREE.Group(); headGroup.position.set(0, 0.6, 0.9); torso.add(headGroup);
    createMesh(new THREE.SphereGeometry(0.5), darkMat, torso, 0, 0.5, 0.8);

    // Eyes
    const eyeBump = new THREE.SphereGeometry(0.35, 24, 24);
    const e1 = createMesh(eyeBump, createStandardMat(0x4ADE80), headGroup, 0.45, 0.1, -0.1);
    const e2 = createMesh(eyeBump, createStandardMat(0x4ADE80), headGroup, -0.45, 0.1, -0.1);
    createMesh(new THREE.SphereGeometry(0.12), darkMat, e1, 0, 0.25, 0.15);
    createMesh(new THREE.SphereGeometry(0.12), darkMat, e2, 0, 0.25, 0.15);
    
    // Speaker Box
    const boombox = createMesh(new THREE.BoxGeometry(1.8, 1.4, 0.8), createStandardMat(0x57534E), torso, 0, 0.5, -0.5);
    
    function buildWoofer(parent, x, y, size) {
        const rim = createMesh(new THREE.TorusGeometry(size, size*0.2, 12, 24), darkMat, parent, x, y, 0.4);
        const cone = createMesh(new THREE.ConeGeometry(size, size*0.6, 32, 1, true), darkMat, rim, 0, 0, -0.1);
        cone.rotation.x = Math.PI/2;
        // Pulse Cap (Beat)
        const pulseCap = createMesh(new THREE.SphereGeometry(size*0.4), leafMat, cone, 0, -size*0.3, 0); 
        animatedParts.special.push({ mesh: pulseCap, type: 'pulse_beat' });
    }
    
    buildWoofer(boombox, 0.45, 0, 0.35);
    buildWoofer(boombox, -0.45, 0, 0.35);
    buildWoofer(boombox, 0.65, 0.45, 0.15);
    buildWoofer(boombox, -0.65, 0.45, 0.15);
    
    // Vines (Waving)
    const vinePath = new THREE.CatmullRomCurve3([ 
        new THREE.Vector3(-0.9, 0.6, 0), new THREE.Vector3(-1.0, 0, 0.4), 
        new THREE.Vector3(-0.8, -0.6, 0.4), new THREE.Vector3(-0.4, -0.5, 0.8) 
    ]);
    const vine = createMesh(new THREE.TubeGeometry(vinePath, 24, 0.06, 8, false), mossMat, boombox, 0, 0, 0);
    animatedParts.special.push({ mesh: vine, type: 'wave_vine' });

    const legPos = [[0.75, -0.3, 0.75], [-0.75, -0.3, 0.75], [0.75, -0.3, -0.75], [-0.75, -0.3, -0.75]];
    legPos.forEach((p, i) => {
        const group = createLimbGroup(torso, p[0], -0.2, p[2]);
        createMesh(new THREE.CylinderGeometry(0.35, 0.38, 0.4, 16), woodMat, group, 0, -0.2, 0);
        createMesh(new THREE.CylinderGeometry(0.38, 0.42, 0.4, 16), woodMat, group, 0, -0.5, 0);
        createMesh(new THREE.BoxGeometry(0.18, 0.1, 0.25), woodMat, group, 0.12, -0.7, 0.2);
        createMesh(new THREE.BoxGeometry(0.18, 0.1, 0.25), woodMat, group, -0.12, -0.7, 0.2);
        animatedParts.legs.push({ mesh: group, baseZ: p[2], phase: i%2===0 ? 0 : Math.PI });
    });

    headSlot = new THREE.Group(); headGroup.add(headSlot); headSlot.position.y = 0.5;
    backSlot = new THREE.Group(); torso.add(backSlot); backSlot.position.z = -0.8;
    accSlot = new THREE.Group(); torso.add(accSlot); accSlot.position.x = 0.8;
}

function buildGeneric() {
    // AAA GENERATOR FOR SCANNED OBJECTS
    // Uses dynamic bodyGeo based on analysis (Round/Slender/Chunky)
    
    // Material Logic based on surfaceFinish
    let mainMat = primMat;
    if (dna.surfaceFinish === 'Metallic') mainMat = createStandardMat(pCol, 0.2, 0.8);
    if (dna.surfaceFinish === 'Glossy') mainMat = createStandardMat(pCol, 0.1, 0.0);
    if (dna.surfaceFinish === 'Emissive' || dna.specialFeature === 'GlowingEyes') mainMat = createLavaMat(pCol);
    if (dna.materialType === 'Jelly') mainMat = jellyMat;
    
    torso = createMesh(bodyGeo, mainMat, charGroup, 0, 0, 0);
    animatedParts.body = torso;

    if (bodyType === 'QUADRUPED') torso.scale.set(1.0, 0.8, 1.4);

    // --- GREEBLES & DETAILS ---
    // Add rivets for metal types
    if (dna.surfaceFinish === 'Metallic' || dna.element === 'Metal') {
        for(let i=0; i<6; i++) {
            createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1), darkMat, torso, 0.5, (Math.random()-0.5), (Math.random()-0.5)).rotation.z = Math.PI/2;
            createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1), darkMat, torso, -0.5, (Math.random()-0.5), (Math.random()-0.5)).rotation.z = Math.PI/2;
        }
    }
    
    // Add Bevel Plates for Chunky types
    if (dna.build === 'Chunky') {
        addArmorPlate(torso, 0, 0, 0.52, 0.6, 0.6, 0.1, secMat);
    }
    
    addGreebles(torso);
    
    const headY = bodyType === 'QUADRUPED' ? 0.6 : 0.8;
    const headZ = bodyType === 'QUADRUPED' ? 0.8 : 0;
    headGroup = new THREE.Group(); 
    headGroup.position.set(0, headY, headZ);
    torso.add(headGroup);
    createMesh(jointGeo, darkMat, headGroup, 0, -0.1, 0); // Neck Joint
    
    const head = createMesh(headGeo, secMat, headGroup, 0, 0, 0);

    const eyeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.02); // Flat Eyes
    const eyeMat = dna.specialFeature === 'GlowingEyes' ? magmaMat : accMat;
    createMesh(eyeGeo, eyeMat, head, 0.2, 0.1, (dna.build === 'Round' || dna.build === 'Slender') ? 0.45 : 0.42);
    createMesh(eyeGeo, eyeMat, head, -0.2, 0.1, (dna.build === 'Round' || dna.build === 'Slender') ? 0.45 : 0.42);

    if (dna.hasEars) {
        const earGeo = new THREE.ConeGeometry(0.15, 0.4, 16);
        const earL = createMesh(earGeo, primMat, head, 0.3, 0.5, 0);
        const earR = createMesh(earGeo, primMat, head, -0.3, 0.5, 0);
        earL.rotation.z = -0.3; earR.rotation.z = 0.3;
        animatedParts.special.push({ mesh: earL, type: 'twitch' });
        animatedParts.special.push({ mesh: earR, type: 'twitch' });
    }

    if (dna.hasHorns) {
        if (dna.hornStyle === 'Antenna') createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), accMat, head, 0, 0.6, 0);
        else {
            const hornGeo = new THREE.ConeGeometry(0.1, 0.4, 16);
            if (dna.hornStyle === 'Uni') createMesh(hornGeo, accMat, head, 0, 0.5, 0.2);
            else { createMesh(hornGeo, accMat, head, 0.25, 0.5, 0); createMesh(hornGeo, accMat, head, -0.25, 0.5, 0); }
        }
    }

    if (dna.hasWings) {
        const wingGeo = new RoundedBoxGeometry(0.8, 0.1, 0.4, 4, 0.02);
        const wY = bodyType === 'QUADRUPED' ? 0.5 : 0.2;
        const w1 = createMesh(wingGeo, accMat, torso, 0.6, wY, -0.2);
        const w2 = createMesh(wingGeo, accMat, torso, -0.6, wY, -0.2);
        w1.rotation.z = -0.3; w2.rotation.z = 0.3;
        animatedParts.special.push({ mesh: w1, type: 'flap' });
        animatedParts.special.push({ mesh: w2, type: 'flap' });
    }
    
    // Tail Logic
    if (bodyType !== 'FLOATING' && dna.tailStyle !== 'None') {
        const tailRoot = createLimbGroup(torso, 0, 0, -0.6);
        const tGeo = dna.tailStyle === 'Segmented' ? new THREE.ConeGeometry(0.1, 0.6, 8) : new THREE.CylinderGeometry(0.05, 0.1, 0.8);
        const tail = createMesh(tGeo, primMat, tailRoot, 0, 0.3, -0.2);
        tail.rotation.x = 1.2;
        animatedParts.tail.push(tailRoot);
    }
    
    // Dynamic Thrusters for Floating types with Flame feature
    if (bodyType === 'FLOATING' && dna.specialFeature === 'ThrusterFlames') {
        const flame = createMesh(new THREE.ConeGeometry(0.1, 0.3, 8), magmaMat, torso, 0, -0.6, 0);
        flame.rotation.x = Math.PI;
        animatedParts.special.push({ mesh: flame, type: 'thruster_flame' });
    }

    headSlot = new THREE.Group(); headSlot.position.set(0, 0.6, 0); head.add(headSlot);
    backSlot = new THREE.Group(); backSlot.position.set(0, 0, -0.5); torso.add(backSlot);
    accSlot = new THREE.Group(); accSlot.position.set(0.8, 0, 0); torso.add(accSlot);

    const limbOffset = bodyType === 'QUADRUPED' ? 0.35 : 0.3; 

    if (bodyType === 'QUADRUPED') {
        const pos = [[limbOffset, -0.4, 0.5], [-limbOffset, -0.4, 0.5], [limbOffset, -0.4, -0.5], [-limbOffset, -0.4, -0.5]];
        pos.forEach((p, i) => {
            const group = createLimbGroup(torso, p[0], -0.1, p[2]);
            const l = createMesh(limbGeo, secMat, group, 0, -0.3, 0);
            createMesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), darkMat, l, 0, -0.3, 0);
            animatedParts.legs.push({ mesh: group, baseZ: p[2], phase: i%2===0 ? 0 : Math.PI });
        });
    } else if (bodyType === 'BIPED') {
        // LEGS
        const lGroup1 = createLimbGroup(torso, 0.2, -0.5, 0);
        const l1 = createMesh(limbGeo, secMat, lGroup1, 0, -0.3, 0);
        createMesh(new THREE.BoxGeometry(0.26, 0.15, 0.3), darkMat, l1, 0, -0.3, 0.05);
        animatedParts.legs.push({ mesh: lGroup1, baseZ: 0, phase: 0 });

        const lGroup2 = createLimbGroup(torso, -0.2, -0.5, 0);
        const l2 = createMesh(limbGeo, secMat, lGroup2, 0, -0.3, 0);
        createMesh(new THREE.BoxGeometry(0.26, 0.15, 0.3), darkMat, l2, 0, -0.3, 0.05);
        animatedParts.legs.push({ mesh: lGroup2, baseZ: 0, phase: Math.PI });

        // ARMS
        const aGroup1 = createLimbGroup(torso, 0.6, 0.3, 0);
        const aGroup2 = createLimbGroup(torso, -0.6, 0.3, 0);
        
        const armGeo = new RoundedBoxGeometry(0.15, 0.9, 0.15, 4, 0.05);
        const a1 = createMesh(armGeo, primMat, aGroup1, 0, -0.45, 0);
        const a2 = createMesh(armGeo, primMat, aGroup2, 0, -0.45, 0);
        createMesh(new THREE.SphereGeometry(0.12), secMat, a1, 0, -0.45, 0);
        createMesh(new THREE.SphereGeometry(0.12), secMat, a2, 0, -0.45, 0);

        aGroup1.rotation.z = 0.2; 
        aGroup2.rotation.z = -0.2;

        animatedParts.arms.push({ mesh: aGroup1, phase: Math.PI, side: 1 });
        animatedParts.arms.push({ mesh: aGroup2, phase: 0, side: -1 });
    }
}

// --- EXECUTE BUILD ---
if (charName === 'PYRO-BIT') {
    buildPyro();
} else if (charName === 'FIZZ-BOT') {
    buildFizz();
} else if (charName === 'MOSS-AMP') {
    buildMoss();
} else {
    buildGeneric();
}

// --- PROPS ---
const props = new THREE.Group();
scene.add(props);

function spawnTree(x, z) {
    const h = 2 + Math.random();
    const y = getTerrainHeight(x, z);
    const m1 = createMesh(new RoundedBoxGeometry(0.3, h, 0.3, 1, 0.05), woodMat, props, x, y + h/2, z);
    const m2 = createMesh(new THREE.IcosahedronGeometry(0.8, 1), leafMat, props, x, y + h + 0.4, z);
    return [m1, m2];
}
function spawnBush(x, z) { const y = getTerrainHeight(x, z); const m = createMesh(new THREE.IcosahedronGeometry(0.5, 0), leafMat, props, x, y + 0.25, z); return [m]; }
function spawnRock(x, z) { const y = getTerrainHeight(x, z); const m = createMesh(new THREE.DodecahedronGeometry(0.4), rockMat, props, x, y + 0.2, z); return [m]; }
function spawnCrystal(x, z) { const y = getTerrainHeight(x, z); const m = createMesh(new THREE.ConeGeometry(0.3, 1, 4), crystalMat, props, x, y + 0.5, z); return [m]; }

let currentBiomeFuncs = [spawnTree, spawnBush]; 

activeChunks.push(new TerrainChunk(0));
activeChunks.push(new TerrainChunk(CHUNK_SIZE));
activeChunks.push(new TerrainChunk(CHUNK_SIZE*2));

const particlesGeo = new THREE.BufferGeometry();
const particleCount = 200;
const pPos = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount; i++) {
    pPos[i*3] = (Math.random()-0.5)*40; pPos[i*3+1] = Math.random()*10; pPos[i*3+2] = (Math.random()-0.5)*40;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particlesMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.6 });
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

const hearts = [];
const heartShape = new THREE.Shape();
const x = 0, y = 0;
heartShape.moveTo(x + 0.25, y + 0.25);
heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
const heartGeo = new THREE.ShapeGeometry(heartShape);
const heartMat = new THREE.MeshBasicMaterial({ color: 0xff69b4, side: THREE.DoubleSide });

function spawnHearts() {
    for(let i=hearts.length-1; i>=0; i--) scene.remove(hearts[i].mesh);
    hearts.length = 0;

    for(let i=0; i<5; i++) {
        const h = new THREE.Mesh(heartGeo, heartMat);
        h.scale.setScalar(0.3);
        h.rotation.z = Math.PI;
        h.position.set(
            charGroup.position.x + (Math.random()-0.5)*1,
            charGroup.position.y + 2 + Math.random(),
            charGroup.position.z + (Math.random()-0.5)*1
        );
        scene.add(h);
        hearts.push({ mesh: h, life: 1.0, velY: 2 + Math.random() });
    }
}

const emoteCanvas = document.createElement('canvas');
emoteCanvas.width = 128; emoteCanvas.height = 128;
const emoteCtx = emoteCanvas.getContext('2d');
const emoteTexture = new THREE.CanvasTexture(emoteCanvas);
const emoteSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTexture, transparent: true }));
emoteSprite.scale.set(2, 2, 1);
emoteSprite.position.set(0, 2.5, 0); 
emoteSprite.visible = false;
charGroup.add(emoteSprite);

function showEmote(emoji) {
    emoteCtx.clearRect(0,0,128,128);
    emoteCtx.font = '80px Arial';
    emoteCtx.textAlign = 'center';
    emoteCtx.textBaseline = 'middle';
    emoteCtx.fillText(emoji, 64, 64);
    emoteTexture.needsUpdate = true;
    emoteSprite.visible = true;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('message', (e) => {
    if (e.data.type === 'PET_CLICKED') {
        triggerPoke();
    }
});

function triggerPoke() {
    if (isBattle) return;
    nextAction = 'HAPPY'; 
    overrideTimer = 1.5;
    spawnHearts(); 
    isLookingAtCamera = true; 
    lookAtTimer = 0; 
    lookAtDuration = 3.0;
    currentAction = 'IDLE'; 
    transitionTimer = 0.2;
    window.parent.postMessage({ type: 'PET_CLICKED_CONFIRM' }, '*');
}

window.addEventListener('pointerdown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(charGroup.children, true);
    if (intersects.length > 0) triggerPoke();
});

renderer.render(scene, camera);

const clock = new THREE.Clock();
let isBattle = false;
let currentAction = 'WALK';
let nextAction = null;
let transitionTimer = 0;
let isPaused = false; 
let overrideTimer = 0;
const targetCamPos = new THREE.Vector3();

let lookAtTimer = 0;
let lookAtDuration = 0;
let isLookingAtCamera = false;
const headTargetRot = new THREE.Quaternion();
const dummyObj = new THREE.Object3D();

window.addEventListener('message', (e) => {
    const { type, value } = e.data;
    if (type === 'SET_THEME') {
        const theme = value;
        let col = 0x6BCB77;
        if(theme === 'Fire') { scene.background.set(0xFFEDD5); scene.fog.color.set(0xFFEDD5); col = 0xFDBA74; leafMat.color.setHex(0xB45309); currentBiomeFuncs = [spawnRock, spawnCrystal]; particlesMat.color.setHex(0xFF4500); }
        else if(theme === 'Water') { scene.background.set(0xDBEAFE); scene.fog.color.set(0xDBEAFE); col = 0x93C5FD; leafMat.color.setHex(0x1E40AF); currentBiomeFuncs = [spawnRock, spawnBush]; particlesMat.color.setHex(0x00FFFF); }
        else if(theme === 'Electric') { scene.background.set(0xFEF9C3); scene.fog.color.set(0xFEF9C3); col = 0xFDE047; leafMat.color.setHex(0xEAB308); currentBiomeFuncs = [spawnCrystal, spawnTree]; particlesMat.color.setHex(0xFFFF00); }
        else if(theme === 'Metal') { scene.background.set(0xF1F5F9); scene.fog.color.set(0xF1F5F9); col = 0xCBD5E1; leafMat.color.setHex(0x64748B); currentBiomeFuncs = [spawnRock, spawnBush]; particlesMat.color.setHex(0xAAAAAA); }
        else if(theme === 'Dark') { scene.background.set(0x312E81); scene.fog.color.set(0x312E81); col = 0x1E1B4B; leafMat.color.setHex(0x4338CA); currentBiomeFuncs = [spawnBush, spawnCrystal]; particlesMat.color.setHex(0x800080); }
        else { scene.background.set(0xD1FAE5); scene.fog.color.set(0xD1FAE5); col = 0x6BCB77; leafMat.color.setHex(0x15803D); currentBiomeFuncs = [spawnTree, spawnBush]; particlesMat.color.setHex(0xFFFFFF); }
        currentThemeColor = col;
        const newTex = createGroundTexture(col);
        activeChunks.forEach(c => c.mesh.material.map = newTex);
    }
    if (type === 'RESUME') { 
        isPaused = false; nextAction = 'WALK'; isBattle = false; overrideTimer = 0; emoteSprite.visible = false;
        transitionTimer = 0.5; 
        currentAction = 'IDLE';
    }
    if (type === 'INTERACT_POKE') { triggerPoke(); }
    if (type === 'HIDE_EMOTES') {
        for(let i=hearts.length-1; i>=0; i--) scene.remove(hearts[i].mesh);
        hearts.length = 0;
        emoteSprite.visible = false;
    }
    if (type === 'SET_ACTION') { 
        if (currentAction !== value && nextAction !== value && overrideTimer <= 0) {
            nextAction = value;
            transitionTimer = 0.5; 
        }
        if (value === 'SLEEP' || value === 'SCAN') { overrideTimer = 8.0; isPaused = true; } 
        if (value === 'JUMP') { overrideTimer = 0.5; }
    }
    if (type === 'SET_EQUIPMENT') { const equip = value || {}; if (equip.head) { clearSlot(headSlot); if(equip.head.includes('crown')) buildCrown(headSlot); if(equip.head.includes('visor')) buildVisor(headSlot); if(equip.head.includes('iron')) buildHelmetIron(headSlot); } if (equip.accessory) { clearSlot(backSlot); if(equip.accessory.includes('wings')) buildWingsAngel(backSlot); if(equip.accessory.includes('pack')) buildJetpack(backSlot); } }
    if (type === 'PRE_EVENT') { 
        isPaused = true; nextAction = 'SCAN'; overrideTimer = 3.0; showEmote(value || '!'); 
        currentAction = 'IDLE'; transitionTimer = 0.5;
    }
    if (type === 'SET_MODE') {
        if (value.startsWith('BATTLE')) {
            isBattle = true; isPaused = true; emoteSprite.visible = false; controls.enabled = false;
            if (value === 'BATTLE_PLAYER') { targetCamPos.set(4, 3, 5); charGroup.rotation.y = Math.PI / 3; } 
            else { targetCamPos.set(-4, 3, 5); charGroup.rotation.y = -Math.PI / 3; }
        } else {
            isBattle = false; isPaused = false; emoteSprite.visible = false; controls.enabled = true; props.visible = true; particles.visible = true; charGroup.rotation.y = 0; targetCamPos.set(5, 4, 12);
        }
    }
});

function lerp(start, end, t) { return start * (1 - t) + end * t; }

function updateGrounding() {
    if (bodyType === 'FLOATING') {
        const terrainY = getTerrainHeight(charGroup.position.x, charGroup.position.z);
        charGroup.position.y = terrainY + 2.0 + Math.sin(clock.elapsedTime)*0.2;
        return;
    }
    
    const terrainY = getTerrainHeight(charGroup.position.x, charGroup.position.z);
    
    let legLength = 0;
    if (bodyType === 'QUADRUPED') legLength = 0.75; 
    else if (bodyType === 'BIPED') legLength = 1.3;
    
    const targetY = terrainY + (legLength * ${scale});
    
    if (Math.abs(charGroup.position.y - targetY) > 1.0) charGroup.position.y = targetY;
    else charGroup.position.y = lerp(charGroup.position.y, targetY, 0.3);
}

function updateChunks(playerZ) {
    const lastChunk = activeChunks[activeChunks.length - 1];
    if (playerZ > lastChunk.zStart - CHUNK_SIZE) {
        const newZ = lastChunk.zStart + CHUNK_SIZE;
        activeChunks.push(new TerrainChunk(newZ));
        if (activeChunks.length > 3) {
            const old = activeChunks.shift();
            old.destroy();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const delta = clock.getDelta();
    
    uniforms.time.value += delta; // Update Shader Time

    if (transitionTimer > 0) {
        transitionTimer -= delta;
        if (transitionTimer <= 0 && nextAction) {
            currentAction = nextAction;
            nextAction = null;
        } else if (transitionTimer > 0) {
             charGroup.rotation.x = lerp(charGroup.rotation.x, 0, 0.1);
             if (bodyType !== 'FLOATING') {
                animatedParts.legs.forEach(l => { l.mesh.rotation.x = lerp(l.mesh.rotation.x, 0, 0.1); });
                animatedParts.arms.forEach(a => { 
                    const side = a.side || 1;
                    // Clamp arm rotation during reset to prevent clipping
                    a.mesh.rotation.x = lerp(a.mesh.rotation.x, 0, 0.1); 
                    a.mesh.rotation.z = lerp(a.mesh.rotation.z, 0.1 * side, 0.1); 
                });
             }
        }
    }

    if (overrideTimer > 0) {
        overrideTimer -= delta;
        if (overrideTimer <= 0 && !isBattle) { 
            nextAction = 'WALK'; isPaused = false; emoteSprite.visible = false; 
            transitionTimer = 0.5;
            torso.position.y = 0;
        }
    }

    // --- VITALITY ANIMATION (Always Breathe & Sway) ---
    const breathe = Math.sin(t * 2) * 0.02;
    torso.scale.set(1 + breathe, 1 + breathe, 1 + breathe); 
    charGroup.rotation.z = Math.sin(t * 1.5) * 0.02; 

    // Animate special parts like glowing embers
    animatedParts.special.forEach(p => {
        if(p.type === 'pulse' || p.type === 'pulse_green') {
            const scale = 1.0 + Math.sin(t * 8.0) * 0.2;
            p.mesh.scale.setScalar(scale);
        } else if (p.type === 'pulse_fire') {
            const scale = 1.0 + Math.sin(t * 15.0) * 0.3; // Faster flicker for fire
            p.mesh.scale.setScalar(scale);
            p.mesh.rotation.y += delta * 2;
        } else if (p.type === 'twitch') {
            if (Math.random() > 0.98) p.mesh.rotation.z += (Math.random()-0.5)*0.2;
            p.mesh.rotation.z = lerp(p.mesh.rotation.z, 0, 0.1);
        } else if (p.type === 'bob') {
            p.mesh.position.y = Math.sin(t * 2) * 0.05;
        } else if (p.type === 'bubble') {
            p.mesh.position.y += p.speed * delta;
            if (p.mesh.position.y > 0.6) p.mesh.position.y = p.startY;
        } else if (p.type === 'bob_limb') {
            p.mesh.position.y += Math.sin(t * 4 + p.offset) * 0.002; 
        } else if (p.type === 'thruster_flame') {
            p.mesh.scale.y = 1.0 + Math.random() * 0.5;
        } else if (p.type === 'bob_straw') {
            p.mesh.rotation.z = -0.3 + Math.sin(t * 3) * 0.05;
        } else if (p.type === 'pulse_beat') {
            p.mesh.scale.setScalar(1.0 + Math.max(0, Math.sin(t * 8)) * 0.2); // Beat sync
        } else if (p.type === 'wave_vine') {
            // No easy way to wave a static TubeGeometry without shader or vertex manipulation here
        } else if (p.type === 'flap') {
            const speed = currentAction === 'RUN' ? 15 : 5;
            p.mesh.rotation.z = Math.sin(t * speed) * 0.4;
        }
    });
    
    // Animate Tail Waves (Snake motion)
    animatedParts.tail.forEach((seg, i) => {
        const speed = currentAction === 'RUN' ? 12 : 6;
        const amp = currentAction === 'RUN' ? 0.4 : 0.2;
        seg.rotation.y = Math.sin(t * speed + i * 0.5) * amp;
    });

    if (!isBattle) {
        let moveSpeed = 0;
        if (!isPaused || currentAction === 'RUN') {
             moveSpeed = currentAction === 'RUN' ? 10.0 : 5.0;
             const speed = moveSpeed * delta;
             
             charGroup.position.z += speed;
             // Lerp camera target to head height for perfect framing
             const headWorld = new THREE.Vector3();
             headGroup.getWorldPosition(headWorld);
             controls.target.lerp(headWorld, 0.1);
             
             camera.position.z += speed;
             
             updateChunks(charGroup.position.z);
             
             dirLight.position.z = charGroup.position.z + 8;
             rimLight.position.z = charGroup.position.z - 10;
             particles.position.z = charGroup.position.z;
             
             const bounceFreq = currentAction === 'RUN' ? 15 : 8;
             torso.position.y = Math.abs(Math.sin(t * bounceFreq)) * 0.1; 
        } else {
             torso.position.y = lerp(torso.position.y, 0, 0.1);
             // Still track head in Idle
             const headWorld = new THREE.Vector3();
             headGroup.getWorldPosition(headWorld);
             controls.target.lerp(headWorld, 0.05);
        }

        updateGrounding();

        if (transitionTimer <= 0) {
            if (currentAction === 'JUMP' || currentAction === 'HAPPY') {
                torso.position.y = Math.abs(Math.sin(t * 10)) * 0.8;
                if (currentAction === 'HAPPY') charGroup.rotation.y += 0.2;
            } 
            else if (currentAction === 'SCAN') {
                headGroup.rotation.y = Math.sin(t * 4) * 0.8;
                isLookingAtCamera = false;
            }
            else if (currentAction === 'SLEEP') { 
                charGroup.rotation.x = lerp(charGroup.rotation.x, -Math.PI / 2, 0.1); 
                charGroup.position.y = lerp(charGroup.position.y, charGroup.position.y - 0.5, 0.1);
            }
            else if ((!isPaused || currentAction === 'RUN')) {
                 charGroup.rotation.x = 0;
                 const limbSpeed = currentAction === 'RUN' ? 18 : 12;
                 const swingAmp = currentAction === 'RUN' ? 1.2 : 0.8;
                 
                 if (bodyType !== 'FLOATING') {
                    animatedParts.legs.forEach(l => { 
                        let rot = Math.sin(t * limbSpeed + l.phase) * swingAmp;
                        rot = Math.max(-1.0, Math.min(1.0, rot));
                        l.mesh.rotation.x = rot; 
                    });
                    animatedParts.arms.forEach(a => { 
                        let rot = Math.sin(t * limbSpeed + a.phase) * swingAmp;
                        rot = Math.max(-1.0, Math.min(1.0, rot)); 
                        a.mesh.rotation.x = rot; 
                        const side = a.side || 1; 
                        a.mesh.rotation.z = (Math.abs(Math.sin(t * limbSpeed)) * 0.2 + 0.1) * side; 
                        a.mesh.rotation.y = Math.sin(t * limbSpeed) * 0.2 * side; 
                    });
                } else charGroup.position.y += Math.sin(t * 5) * 0.05; 
            } else {
                 // IDLE VITALITY (Swaying limbs gently)
                 charGroup.rotation.x = 0;
                 if (bodyType !== 'FLOATING') {
                    animatedParts.legs.forEach(l => { l.mesh.rotation.x = lerp(l.mesh.rotation.x, 0, 0.1); });
                    animatedParts.arms.forEach(a => { 
                        const side = a.side || 1;
                        a.mesh.rotation.x = Math.sin(t * 2) * 0.05; // Idle sway
                        a.mesh.rotation.z = 0.1 * side + Math.sin(t * 1.5) * 0.05; 
                    });
                 }
                 // Whip tail gently in idle
                 animatedParts.tail.forEach((seg, i) => {
                    seg.rotation.y = Math.sin(t * 2 + i * 0.3) * 0.1;
                 });
            }
        }

        const cameraDir = camera.position.clone().sub(charGroup.position).normalize();
        const forward = new THREE.Vector3(0, 0, 1); 
        const dot = cameraDir.dot(forward);

        lookAtTimer += delta;
        if (lookAtTimer > lookAtDuration) {
            lookAtTimer = 0;
            if (Math.random() > 0.7 && dot > 0 && currentAction !== 'SLEEP' && currentAction !== 'SCAN') {
                isLookingAtCamera = true;
                lookAtDuration = 2.0 + Math.random() * 1.0; 
            } else {
                isLookingAtCamera = false;
                lookAtDuration = 5.0 + Math.random() * 5.0; 
            }
        }

        if (currentAction === 'SCAN') isLookingAtCamera = false; 
        if (currentAction === 'HAPPY') isLookingAtCamera = true;

        if (isLookingAtCamera && dot > 0) {
            const target = camera.position.clone();
            target.y -= 1; 
            dummyObj.position.copy(headGroup.getWorldPosition(new THREE.Vector3()));
            dummyObj.lookAt(target);
            headTargetRot.copy(dummyObj.quaternion);
        } else {
            const lookAround = Math.sin(t * 0.5) * 0.3; 
            headTargetRot.setFromEuler(new THREE.Euler(Math.sin(t*0.5)*0.05, lookAround, 0));
        }
        
        headGroup.quaternion.slerp(headTargetRot, 0.1);

    } else {
        updateGrounding(); 
        if (targetCamPos.x > 0) { 
            charGroup.rotation.y = Math.PI / 3;
            const zBase = charGroup.position.z;
            camera.position.lerp(new THREE.Vector3(targetCamPos.x, targetCamPos.y, zBase + targetCamPos.z), 0.05);
            // In battle, target the midpoint between fighters roughly, or just above ground
            controls.target.lerp(new THREE.Vector3(0, 1.5, zBase), 0.1);
        } else {
            charGroup.rotation.y = -Math.PI / 3; 
            camera.position.lerp(new THREE.Vector3(targetCamPos.x, targetCamPos.y, targetCamPos.z), 0.05);
            controls.target.lerp(new THREE.Vector3(0, 1.5, 0), 0.1);
        }
        headGroup.rotation.set(0,0,0); 
    }
    
    if (emoteSprite.visible) {
        emoteSprite.position.y = 3 + Math.sin(t * 10) * 0.2;
        emoteSprite.lookAt(camera.position);
    }

    for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        h.life -= delta * 2.0; 
        h.mesh.position.y += h.velY * delta;
        h.mesh.material.opacity = h.life;
        h.mesh.rotation.z = Math.PI + Math.sin(t * 10 + i)*0.5; 
        if (h.life <= 0) {
            scene.remove(h.mesh);
            hearts.splice(i, 1);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
</script>
</body>
</html>`;
};

export const evolveVoxelScene = async (pet: any) => {
    const nextStage = getNextStage(pet.stage);
    const code = getGenericVoxel(pet.element, pet.bodyType, nextStage, pet.visualTraits, pet.name);
    return {
        code,
        nextStage,
        nextName: getEvolvedName(pet.name, nextStage),
        visual_design: `Evolved form of ${pet.name}`
    };
};

function getNextStage(current: string): MonsterStage {
    if (current === 'Noob') return 'Pro';
    if (current === 'Pro') return 'Elite';
    return 'Legend';
}

function getEvolvedName(name: string, stage: string): string {
    if (name.includes('Mega')) return name.replace('Mega', 'Giga');
    return `Mega ${name}`;
}
