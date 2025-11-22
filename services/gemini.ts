
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { VisualTraits, MonsterStage } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image using the most advanced Gemini model (1.5 Pro) 
 * to extract deep "Visual DNA" for AAA character generation.
 */
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    {
                        text: `You are a Lead Creature Artist for a AAA monster taming game. 
                        Analyze this image with extreme precision to extract its "Visual DNA" for a 3D voxel generator.
                        
                        Look for:
                        1. Material properties (Is it shiny plastic? Matte fur? Glowing metal?).
                        2. Structural details (Does it have distinct limbs, floating parts, armor plates?).
                        3. Dominant colors (Extract exact hex codes).
                        
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
                surfaceFinish: 'Matte', 
                extractedColors: { primary: '#CBD5E1', secondary: '#F1F5F9', accent: '#333333' } 
            }
        };
    }
};

/**
 * Generates the AAA Voxel Engine HTML string using PBR and deterministic physics.
 */
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob', visualTraits?: VisualTraits): string => {
    
    const dna = visualTraits || { 
        hasHorns: false, hasWings: false, 
        build: 'Chunky', accessory: 'None', hasEars: false, 
        surfaceFinish: 'Matte', 
        extractedColors: { primary: '#CBD5E1', secondary: '#F1F5F9', accent: '#333333' } 
    };

    const pCol = dna.extractedColors?.primary ? parseInt(dna.extractedColors.primary.replace('#', '0x'), 16) : 0xCBD5E1;
    const sCol = dna.extractedColors?.secondary ? parseInt(dna.extractedColors.secondary.replace('#', '0x'), 16) : 0xFFFFFF;
    const aCol = dna.extractedColors?.accent ? parseInt(dna.extractedColors.accent.replace('#', '0x'), 16) : 0x333333;

    let materialType = 'Standard'; // Default to PBR Standard
    let roughness = 0.6;
    let metalness = 0.1;
    let clearcoat = 0.0;

    if (dna.surfaceFinish === 'Glossy') {
        materialType = 'Physical';
        roughness = 0.2;
        clearcoat = 1.0;
    } else if (dna.surfaceFinish === 'Metallic') {
        materialType = 'Standard';
        roughness = 0.3;
        metalness = 0.9;
    } else if (dna.surfaceFinish === 'Emissive') {
        materialType = 'Toon'; 
    }

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
camera.position.set(5, 4, 12); // Default Angle

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: "high-performance"});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05; 
controls.minDistance = 4;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going under ground
controls.target.set(0, 1.5, 0);
controls.enableRotate = true;

// --- LIGHTING ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); 
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(-5, 5, -10); 
scene.add(rimLight);

// --- MATERIALS ---
const matType = '${materialType}';
const roughness = ${roughness};
const metalness = ${metalness};
const clearcoat = ${clearcoat};

function createMat(col) {
    if (matType === 'Physical') {
        return new THREE.MeshPhysicalMaterial({ color: col, roughness, metalness, clearcoat, clearcoatRoughness: 0.1 });
    } else if (matType === 'Standard') {
        return new THREE.MeshStandardMaterial({ color: col, roughness, metalness });
    } else {
        return new THREE.MeshToonMaterial({ color: col, shininess: 10 });
    }
}

const primMat = createMat(${pCol});
const secMat = createMat(${sCol});
const accMat = createMat(${aCol});
const darkMat = createMat(0x222222);
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xFFD700, metalness: 1.0, roughness: 0.2 });
const silverMat = new THREE.MeshPhysicalMaterial({ color: 0xC0C0C0, metalness: 0.9, roughness: 0.3 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6, roughness: 0, metalness: 0.5, transmission: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x6BCB77, roughness: 0.8 }); 
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.9 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.5, transmission: 0.5, thickness: 1.0 });

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const OUTLINE_THICKNESS = 1.025; 

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
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const baseCol = new THREE.Color(hexColor);
    ctx.fillStyle = '#' + baseCol.getHexString();
    ctx.fillRect(0,0,512,512);
    for(let i=0; i<2000; i++) {
        const shade = Math.random() > 0.5 ? 0.9 : 1.1; 
        const col = baseCol.clone().multiplyScalar(shade);
        ctx.fillStyle = '#' + col.getHexString();
        const x = Math.floor(Math.random()*64)*8;
        const y = Math.floor(Math.random()*64)*8;
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
        const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 32, 32);
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
        const count = 12;
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

const bodyGeo = new RoundedBoxGeometry(1, 1, 1, 8, 0.15);
const headGeo = new RoundedBoxGeometry(0.8, 0.8, 0.8, 8, 0.15);
const limbGeo = new RoundedBoxGeometry(0.25, 0.6, 0.25, 4, 0.05);
const jointGeo = new THREE.SphereGeometry(0.18, 16, 16);

const torso = createMesh(bodyGeo, primMat, charGroup, 0, 0, 0);

if (dna.build === 'Chunky') torso.scale.set(1.3, 1.1, 1.3);
if (dna.build === 'Slender') torso.scale.set(0.7, 1.1, 0.7);
if (bodyType === 'QUADRUPED') torso.scale.set(1.0, 0.8, 1.4);

addArmorPlate(torso, 0, 0, 0.52, 0.6, 0.6, 0.1, secMat);
addGreebles(torso);

const headY = bodyType === 'QUADRUPED' ? 0.6 : 0.8;
const headZ = bodyType === 'QUADRUPED' ? 0.8 : 0;
const headGroup = new THREE.Group(); 
headGroup.position.set(0, headY, headZ);
torso.add(headGroup);
const head = createMesh(headGeo, secMat, headGroup, 0, 0, 0);

addArmorPlate(head, 0, 0.1, 0.42, 0.7, 0.5, 0.05, primMat);
const eyeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.05);
createMesh(eyeGeo, accMat, head, 0.2, 0.1, 0.42);
createMesh(eyeGeo, accMat, head, -0.2, 0.1, 0.42);

if (dna.hasEars) {
    const earGeo = new THREE.ConeGeometry(0.15, 0.4, 16);
    const earL = createMesh(earGeo, primMat, head, 0.3, 0.5, 0);
    const earR = createMesh(earGeo, primMat, head, -0.3, 0.5, 0);
    earL.rotation.z = -0.3; earR.rotation.z = 0.3;
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
}

const headSlot = new THREE.Group(); headSlot.position.set(0, 0.6, 0); head.add(headSlot);
const backSlot = new THREE.Group(); backSlot.position.set(0, 0, -0.5); torso.add(backSlot);
const accSlot = new THREE.Group(); accSlot.position.set(0.8, 0, 0); torso.add(accSlot);

function clearSlot(slot) { while(slot.children.length>0) slot.remove(slot.children[0]); }
function buildCrown(p) { const b = createMesh(new THREE.CylinderGeometry(0.5,0.5,0.2,16), goldMat, p, 0,0,0); for(let i=0;i<5;i++) { const a=(i/5)*Math.PI*2; createMesh(new THREE.ConeGeometry(0.08,0.3,8), goldMat, b, Math.sin(a)*0.45,0.2,Math.cos(a)*0.45); } }
function buildVisor(p) { createMesh(new RoundedBoxGeometry(0.7,0.2,0.3,4,0.05), glassMat, p, 0,-0.1,0.3); }
function buildHelmetIron(p) { createMesh(new RoundedBoxGeometry(0.9,0.5,0.9,4,0.1), silverMat, p, 0,0.2,0); }
function buildWingsAngel(p) { const g=new RoundedBoxGeometry(1.5,0.1,0.5,4,0.05); const m=new THREE.MeshPhysicalMaterial({color:0xffffff, transmission:0.5, thickness:0.5}); createMesh(g,m,p,0.8,0.5,0).rotation.z=-0.5; createMesh(g,m,p,-0.8,0.5,0).rotation.z=0.5; }
function buildJetpack(p) { createMesh(new THREE.CylinderGeometry(0.15,0.15,0.6), silverMat, p, 0.2,0.2,0); createMesh(new THREE.CylinderGeometry(0.15,0.15,0.6), silverMat, p, -0.2,0.2,0); }

const animatedParts = { legs: [], arms: [], body: torso };
const limbOffset = bodyType === 'QUADRUPED' ? 0.35 : 0.3; 

if (bodyType === 'QUADRUPED') {
    const pos = [[limbOffset, -0.4, 0.5], [-limbOffset, -0.4, 0.5], [limbOffset, -0.4, -0.5], [-limbOffset, -0.4, -0.5]];
    pos.forEach((p, i) => {
        const group = createLimbGroup(torso, p[0], -0.1, p[2]);
        createMesh(jointGeo, darkMat, group, 0, 0, 0);
        const l = createMesh(limbGeo, secMat, group, 0, -0.3, 0);
        createMesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), darkMat, l, 0, -0.3, 0);
        animatedParts.legs.push({ mesh: group, baseZ: p[2], phase: i%2===0 ? 0 : Math.PI });
    });
} else if (bodyType === 'BIPED') {
    // LEGS
    const lGroup1 = createLimbGroup(torso, 0.2, -0.5, 0);
    createMesh(jointGeo, darkMat, lGroup1, 0, 0, 0);
    const l1 = createMesh(limbGeo, secMat, lGroup1, 0, -0.3, 0);
    createMesh(new THREE.BoxGeometry(0.26, 0.15, 0.3), darkMat, l1, 0, -0.3, 0.05);
    animatedParts.legs.push({ mesh: lGroup1, baseZ: 0, phase: 0 });

    const lGroup2 = createLimbGroup(torso, -0.2, -0.5, 0);
    createMesh(jointGeo, darkMat, lGroup2, 0, 0, 0);
    const l2 = createMesh(limbGeo, secMat, lGroup2, 0, -0.3, 0);
    createMesh(new THREE.BoxGeometry(0.26, 0.15, 0.3), darkMat, l2, 0, -0.3, 0.05);
    animatedParts.legs.push({ mesh: lGroup2, baseZ: 0, phase: Math.PI });

    // ARMS - FIXED ROTATION OFFSET
    const aGroup1 = createLimbGroup(torso, 0.6, 0.3, 0);
    createMesh(jointGeo, darkMat, aGroup1, 0, 0, 0);
    const aGroup2 = createLimbGroup(torso, -0.6, 0.3, 0);
    createMesh(jointGeo, darkMat, aGroup2, 0, 0, 0);
    
    const armGeo = new RoundedBoxGeometry(0.15, 0.9, 0.15, 4, 0.05);
    const a1 = createMesh(armGeo, primMat, aGroup1, 0, -0.45, 0);
    const a2 = createMesh(armGeo, primMat, aGroup2, 0, -0.45, 0);
    createMesh(new THREE.SphereGeometry(0.12), secMat, a1, 0, -0.45, 0);
    createMesh(new THREE.SphereGeometry(0.12), secMat, a2, 0, -0.45, 0);

    // Side 1 = Left (Positive X), Side -1 = Right (Negative X)
    // Initialize arm rotations correctly for resting state
    aGroup1.rotation.z = 0.2; 
    aGroup2.rotation.z = -0.2;

    animatedParts.arms.push({ mesh: aGroup1, phase: Math.PI, side: 1 });
    animatedParts.arms.push({ mesh: aGroup2, phase: 0, side: -1 });
}

// --- PROPS ---
const props = new THREE.Group();
scene.add(props);

function spawnTree(x, z) {
    const h = 2 + Math.random();
    const y = getTerrainHeight(x, z);
    const m1 = createMesh(new RoundedBoxGeometry(0.3, h, 0.3, 1, 0.05), woodMat, props, x, y + h/2, z);
    const m2 = createMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.1), leafMat, props, x, y + h + 0.4, z);
    return [m1, m2];
}
function spawnBush(x, z) { const y = getTerrainHeight(x, z); const m = createMesh(new RoundedBoxGeometry(0.6, 0.5, 0.6, 2, 0.1), leafMat, props, x, y + 0.25, z); return [m]; }
function spawnRock(x, z) { const y = getTerrainHeight(x, z); const m = createMesh(new RoundedBoxGeometry(0.5, 0.4, 0.5, 2, 0.1), rockMat, props, x, y + 0.2, z); return [m]; }
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
    // Clean up existing hearts to prevent spam
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

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('message', (e) => {
    if (e.data.type === 'PET_CLICKED') {
        // This message now comes from iframe click handler directly, 
        // but we can also listen for external triggers
        triggerPoke();
    }
    // ... other handlers
});

function triggerPoke() {
    if (isBattle) return;
    nextAction = 'HAPPY'; 
    overrideTimer = 1.5;
    spawnHearts(); 
    isLookingAtCamera = true; 
    lookAtTimer = 0; 
    lookAtDuration = 3.0;
    // Force transition logic to handle this gracefully
    currentAction = 'IDLE'; 
    transitionTimer = 0.2;
    
    // Notify parent to show speech bubble
    window.parent.postMessage({ type: 'PET_CLICKED_CONFIRM' }, '*');
}

// Handle click inside canvas
window.addEventListener('pointerdown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(charGroup.children, true);
    
    if (intersects.length > 0) {
        triggerPoke();
    }
});


// --- MAIN LOOP ---
renderer.render(scene, camera);

const clock = new THREE.Clock();
let isBattle = false;
let currentAction = 'WALK';
let nextAction = null;
let transitionTimer = 0;
let isPaused = false; 
let overrideTimer = 0;
const targetCamPos = new THREE.Vector3();

// Head Tracking Vars
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
        transitionTimer = 0.5; // Seamless transition
        currentAction = 'IDLE';
    }
    if (type === 'INTERACT_POKE') {
        triggerPoke();
    }
    if (type === 'HIDE_EMOTES') {
        for(let i=hearts.length-1; i>=0; i--) scene.remove(hearts[i].mesh);
        hearts.length = 0;
        emoteSprite.visible = false;
    }
    if (type === 'SET_ACTION') { 
        // Only change if different AND not already queued AND not currently interacting
        if (currentAction !== value && nextAction !== value && overrideTimer <= 0) {
            nextAction = value;
            // Don't force IDLE immediately, let transition happen
            // currentAction = 'IDLE'; 
            transitionTimer = 0.5; // Start blending/waiting
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

function snapToFloor() {
    if (bodyType === 'FLOATING') {
        charGroup.position.y = getTerrainHeight(charGroup.position.x, charGroup.position.z) + 2.0 + Math.sin(clock.elapsedTime)*0.2;
        return;
    }
    
    const terrainY = getTerrainHeight(charGroup.position.x, charGroup.position.z);
    
    let legOffset = 0;
    if (bodyType === 'QUADRUPED') legOffset = 0.7 * ${scale}; 
    else if (bodyType === 'BIPED') legOffset = 1.3 * ${scale};
    
    const targetY = terrainY + legOffset;
    charGroup.position.y = lerp(charGroup.position.y, targetY, 0.2);
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
    
    // Transition Logic
    if (transitionTimer > 0) {
        transitionTimer -= delta;
        // Blend phase
        if (transitionTimer <= 0 && nextAction) {
            currentAction = nextAction;
            nextAction = null;
        } else if (transitionTimer > 0) {
            // During transition, lerp to IDLE stance
             charGroup.rotation.x = lerp(charGroup.rotation.x, 0, 0.1);
             if (bodyType !== 'FLOATING') {
                animatedParts.legs.forEach(l => { l.mesh.rotation.x = lerp(l.mesh.rotation.x, 0, 0.1); });
                animatedParts.arms.forEach(a => { 
                    const side = a.side || 1;
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

    if (!isBattle) {
        if (!isPaused || currentAction === 'RUN') {
             const moveSpeed = currentAction === 'RUN' ? 10.0 : 5.0;
             const speed = moveSpeed * delta;
             
             charGroup.position.z += speed;
             camera.position.z += speed;
             controls.target.z += speed;
             
             updateChunks(charGroup.position.z);
             
             dirLight.position.z = charGroup.position.z + 8;
             rimLight.position.z = charGroup.position.z - 10;
             particles.position.z = charGroup.position.z;
             
             const bounceFreq = currentAction === 'RUN' ? 15 : 8;
             torso.position.y = Math.abs(Math.sin(t * bounceFreq)) * 0.1; 
        } else {
             torso.position.y = lerp(torso.position.y, 0, 0.1);
        }

        snapToFloor();

        // ONLY APPLY ANIMATIONS IF NOT TRANSITIONING
        if (transitionTimer <= 0) {
            if (currentAction === 'JUMP' || currentAction === 'HAPPY') {
                torso.position.y = Math.abs(Math.sin(t * 10)) * 0.8;
                if (currentAction === 'HAPPY') charGroup.rotation.y += 0.2;
            } 
            else if (currentAction === 'SCAN') headGroup.rotation.y = Math.sin(t * 4) * 0.8;
            else if (currentAction === 'SLEEP') { 
                charGroup.rotation.x = lerp(charGroup.rotation.x, -Math.PI / 2, 0.1); 
                charGroup.position.y = lerp(charGroup.position.y, charGroup.position.y - 0.5, 0.1);
            }
            else if ((!isPaused || currentAction === 'RUN')) {
                 charGroup.rotation.x = 0;
                 const limbSpeed = currentAction === 'RUN' ? 18 : 12;
                 const swingAmp = currentAction === 'RUN' ? 1.2 : 0.8;
                 
                 if (bodyType !== 'FLOATING') {
                    animatedParts.legs.forEach(l => { l.mesh.rotation.x = Math.sin(t * limbSpeed + l.phase) * swingAmp; });
                    animatedParts.arms.forEach(a => { 
                        a.mesh.rotation.x = Math.sin(t * limbSpeed + a.phase) * swingAmp; 
                        // CORRECT ARM ROTATION using side property
                        const side = a.side || 1; 
                        a.mesh.rotation.z = (Math.abs(Math.sin(t * limbSpeed)) * 0.2 + 0.1) * side; // Swing OUT relative to body
                        a.mesh.rotation.y = Math.sin(t * limbSpeed) * 0.2 * side; // Twist properly
                    });
                } else charGroup.position.y += Math.sin(t * 5) * 0.05; 
            } else {
                 // IDLE Stance
                 charGroup.rotation.x = 0;
                 if (bodyType !== 'FLOATING') {
                    animatedParts.legs.forEach(l => { l.mesh.rotation.x = lerp(l.mesh.rotation.x, 0, 0.1); });
                    animatedParts.arms.forEach(a => { 
                        const side = a.side || 1;
                        a.mesh.rotation.x = lerp(a.mesh.rotation.x, 0, 0.1); 
                        a.mesh.rotation.z = lerp(a.mesh.rotation.z, 0.1 * side, 0.1); 
                    });
                 }
            }
        }

        const cameraDir = camera.position.clone().sub(charGroup.position).normalize();
        const forward = new THREE.Vector3(0, 0, 1); 
        const dot = cameraDir.dot(forward);

        lookAtTimer += delta;
        if (lookAtTimer > lookAtDuration) {
            lookAtTimer = 0;
            // Chance to look at camera only if moving or idle, not doing specific action like sleep
            if (Math.random() > 0.7 && dot > 0 && currentAction !== 'SLEEP' && currentAction !== 'SCAN') {
                isLookingAtCamera = true;
                lookAtDuration = 2.0 + Math.random() * 1.0; // Brief look (2-3s)
            } else {
                isLookingAtCamera = false;
                lookAtDuration = 5.0 + Math.random() * 5.0; // Long break (5-10s)
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
            // Look around (celingak celinguk)
            // Slow sine wave for Y rotation
            const lookAround = Math.sin(t * 0.5) * 0.3; 
            headTargetRot.setFromEuler(new THREE.Euler(Math.sin(t*0.5)*0.05, lookAround, 0));
        }
        
        headGroup.quaternion.slerp(headTargetRot, 0.1);

    } else {
        snapToFloor(); 
        if (targetCamPos.x > 0) { 
            charGroup.rotation.y = Math.PI / 3;
            const zBase = charGroup.position.z;
            camera.position.lerp(new THREE.Vector3(targetCamPos.x, targetCamPos.y, zBase + targetCamPos.z), 0.05);
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
        h.life -= delta * 2.0; // Faster fade (0.5s)
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
    const code = getGenericVoxel(pet.element, pet.bodyType, nextStage, pet.visualTraits);
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