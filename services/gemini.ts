
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { VisualTraits, MonsterStage } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image using Gemini 1.5 Pro to extract "Visual DNA".
 */
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    {
                        text: `You are a Creature Designer for a high-end monster taming game. 
                        Analyze this image and extract its "Visual DNA" to build a unique 3D voxel monster.
                        
                        STRICTLY RETURN JSON ONLY. No markdown blocks.
                        
                        JSON Structure:
                        {
                            "name": "Creative Name",
                            "element": "Fire" | "Water" | "Grass" | "Electric" | "Psychic" | "Metal" | "Dark" | "Light" | "Spirit" | "Toxic",
                            "hp": number (60-150),
                            "atk": number (10-50),
                            "def": number (10-50),
                            "spd": number (10-50),
                            "description": "Short witty bio.",
                            "bodyType": "BIPED" | "QUADRUPED" | "FLOATING",
                            "visual_design": "Short description.",
                            "visualTraits": {
                                "hasHorns": boolean,
                                "hornStyle": "Uni" | "Dual" | "Antenna" | "None",
                                "hasWings": boolean,
                                "wingStyle": "Feather" | "Bat" | "Mech" | "None",
                                "accessory": "Goggles" | "Scarf" | "Helmet" | "Backpack" | "None",
                                "build": "Chunky" | "Slender" | "Round",
                                "hasEars": boolean,
                                "surfaceFinish": "Matte" | "Glossy" | "Metallic",
                                "extractedColors": {
                                    "primary": "Hex Code from dominant object color",
                                    "secondary": "Hex Code from secondary color",
                                    "accent": "Hex Code from details"
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
            hp: 50, atk: 10, def: 10, spd: 10,
            description: "An anomaly in the scanner.",
            bodyType: "FLOATING",
            visual_design: "Unknown form.",
            visualTraits: { 
                hasHorns: false, hasWings: false, 
                build: 'Round', accessory: 'None', hasEars: false, 
                surfaceFinish: 'Matte', 
                extractedColors: { primary: '#CCCCCC', secondary: '#888888', accent: '#FF0000' } 
            }
        };
    }
};

/**
 * Generates the AAA Voxel Engine HTML string.
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

    let shininess = 0;
    if (dna.surfaceFinish === 'Glossy') shininess = 100;
    if (dna.surfaceFinish === 'Metallic') shininess = 150;

    const scale = stage === 'Legend' ? 2.4 : stage === 'Elite' ? 1.8 : stage === 'Pro' ? 1.4 : 1.0;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent !important; }
    canvas { display: block; width: 100% !important; height: 100% !important; outline: none; }
</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xD1FAE5); 
scene.fog = new THREE.FogExp2(0xD1FAE5, 0.025);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(5, 4, 12);

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05; 
controls.minDistance = 5;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 1.5, 0);
controls.enableRotate = true;

// --- RAYCASTER FOR INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;

window.addEventListener('mousedown', () => { isDragging = false; });
window.addEventListener('mousemove', () => { isDragging = true; });
window.addEventListener('mouseup', (e) => {
    if (isDragging) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(charGroup.children, true);
    if (intersects.length > 0) {
        triggerPoke();
    }
});
window.addEventListener('touchstart', (e) => { isDragging = false; });
window.addEventListener('touchmove', () => { isDragging = true; });
window.addEventListener('touchend', (e) => {
    if (isDragging) return;
    const touch = e.changedTouches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(charGroup.children, true);
    if (intersects.length > 0) {
        triggerPoke();
    }
});

function triggerPoke() {
    currentAction = 'JUMP';
    isMoving = false; // Pause walk briefly
    window.parent.postMessage({ type: 'PET_CLICKED' }, '*');
    setTimeout(() => { 
        if (currentAction === 'JUMP') currentAction = 'WALK'; // Resume
        // isMoving logic handles resuming walk in loop
    }, 1000);
}

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1); 
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight.position.set(-5, 5, -10);
scene.add(rimLight);

// MATERIALS
const toonMat = (col) => new THREE.MeshToonMaterial({ color: col, shininess: ${shininess} });
const primMat = toonMat(${pCol});
const secMat = toonMat(${sCol});
const accMat = toonMat(${aCol});
const darkMat = toonMat(0x222222);
const goldMat = toonMat(0xFFD700);
const silverMat = toonMat(0xC0C0C0);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6, roughness: 0, metalness: 0.5 });
const leafMat = toonMat(0x6BCB77); 
const woodMat = toonMat(0x8D6E63);
const rockMat = toonMat(0x888888);
const crystalMat = new THREE.MeshToonMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.5 });
const billboardMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, side: THREE.DoubleSide });

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
        const ventG = new RoundedBoxGeometry(0.4, 0.1, 0.05, 1, 0.01);
        createMesh(ventG, darkMat, parent, 0, 0.2, 0.51);
        createMesh(ventG, darkMat, parent, 0, 0.0, 0.51);
        createMesh(ventG, darkMat, parent, 0, -0.2, 0.51);
    }
}

// --- ROLLING HILLS GROUND ---
function createHillGeometry() {
    const geo = new THREE.PlaneGeometry(200, 200, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i); // This is Z in world space
        const height = Math.sin(x * 0.1) * 1.5 + Math.cos(y * 0.1) * 1.5;
        pos.setZ(i, height);
    }
    geo.computeVertexNormals();
    return geo;
}

function createGroundTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const baseCol = new THREE.Color(hexColor);
    
    ctx.fillStyle = '#' + baseCol.getHexString();
    ctx.fillRect(0,0,512,512);
    
    for(let i=0; i<800; i++) {
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
    tex.repeat.set(40, 40); 
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const groundMat = new THREE.MeshToonMaterial({ map: createGroundTexture(0x6BCB77) });
const ground = new THREE.Mesh(createHillGeometry(), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2; 
ground.receiveShadow = true;
scene.add(ground);

// --- CHARACTER ---
const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

const bodyType = '${bodyType}';

const bodyGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.15);
const headGeo = new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.15);
const limbGeo = new RoundedBoxGeometry(0.25, 0.6, 0.25, 2, 0.05);
const jointGeo = new THREE.SphereGeometry(0.18, 8, 8);

const torso = createMesh(bodyGeo, primMat, charGroup, 0, 0, 0);
const dna = ${JSON.stringify(dna)};

if (dna.build === 'Chunky') torso.scale.set(1.3, 1.1, 1.3);
if (dna.build === 'Slender') torso.scale.set(0.7, 1.1, 0.7);
if (bodyType === 'QUADRUPED') torso.scale.set(1.0, 0.8, 1.4);

// Chest Armor
addArmorPlate(torso, 0, 0, 0.52, 0.6, 0.6, 0.1, secMat);
addGreebles(torso);

// Head
const headY = bodyType === 'QUADRUPED' ? 0.6 : 0.8;
const headZ = bodyType === 'QUADRUPED' ? 0.8 : 0;
const headGroup = new THREE.Group(); 
headGroup.position.set(0, headY, headZ);
torso.add(headGroup);
const head = createMesh(headGeo, secMat, headGroup, 0, 0, 0);

addArmorPlate(head, 0, 0.1, 0.42, 0.7, 0.5, 0.05, primMat);

// Eyes
const eyeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.05);
const eyeL = createMesh(eyeGeo, accMat, head, 0.2, 0.1, 0.42);
const eyeR = createMesh(eyeGeo, accMat, head, -0.2, 0.1, 0.42);

// Ears / Horns
if (dna.hasEars) {
    const earGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const earL = createMesh(earGeo, primMat, head, 0.3, 0.5, 0);
    const earR = createMesh(earGeo, primMat, head, -0.3, 0.5, 0);
    earL.rotation.z = -0.3; earR.rotation.z = 0.3;
}

if (dna.hasHorns) {
    if (dna.hornStyle === 'Antenna') {
        createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), accMat, head, 0, 0.6, 0);
    } else {
        const hornGeo = new THREE.ConeGeometry(0.1, 0.4, 8);
        if (dna.hornStyle === 'Uni') createMesh(hornGeo, accMat, head, 0, 0.5, 0.2);
        else {
            createMesh(hornGeo, accMat, head, 0.25, 0.5, 0);
            createMesh(hornGeo, accMat, head, -0.25, 0.5, 0);
        }
    }
}

// Wings
if (dna.hasWings) {
    const wingGeo = new RoundedBoxGeometry(0.8, 0.1, 0.4, 2, 0.02);
    const wY = bodyType === 'QUADRUPED' ? 0.5 : 0.2;
    const w1 = createMesh(wingGeo, accMat, torso, 0.6, wY, -0.2);
    const w2 = createMesh(wingGeo, accMat, torso, -0.6, wY, -0.2);
    w1.rotation.z = -0.3; w2.rotation.z = 0.3;
}

// --- EQUIPMENT SLOTS ---
const headSlot = new THREE.Group(); headSlot.position.set(0, 0.6, 0); head.add(headSlot);
const backSlot = new THREE.Group(); backSlot.position.set(0, 0, -0.5); torso.add(backSlot);
const accSlot = new THREE.Group(); accSlot.position.set(0.8, 0, 0); torso.add(accSlot);

function clearSlot(slot) {
    while(slot.children.length > 0){ 
        slot.remove(slot.children[0]); 
    }
}

function buildCrown(parent) {
    const base = createMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 8), goldMat, parent, 0, 0, 0);
    for(let i=0; i<5; i++) {
        const angle = (i/5) * Math.PI * 2;
        const x = Math.sin(angle) * 0.45;
        const z = Math.cos(angle) * 0.45;
        createMesh(new THREE.ConeGeometry(0.08, 0.3, 4), goldMat, base, x, 0.2, z);
    }
}

function buildVisor(parent) {
    const visor = createMesh(new RoundedBoxGeometry(0.7, 0.2, 0.3, 2, 0.05), glassMat, parent, 0, -0.1, 0.3);
    createMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color:0xff0000}), visor, 0.3, 0, 0.15);
}

function buildHelmetIron(parent) {
    createMesh(new RoundedBoxGeometry(0.9, 0.5, 0.9, 4, 0.1), silverMat, parent, 0, 0.2, 0);
    createMesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), goldMat, parent, 0, 0.5, 0); 
}

function buildWingsAngel(parent) {
    const wGeo = new RoundedBoxGeometry(1.5, 0.1, 0.5, 2, 0.05);
    const w1 = createMesh(wGeo, new THREE.MeshToonMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.8}), parent, 0.8, 0.5, 0);
    const w2 = createMesh(wGeo, new THREE.MeshToonMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.8}), parent, -0.8, 0.5, 0);
    w1.rotation.z = -0.5; w2.rotation.z = 0.5;
}

function buildJetpack(parent) {
    const tank = new THREE.CylinderGeometry(0.15, 0.15, 0.6);
    createMesh(tank, silverMat, parent, 0.2, 0.2, 0);
    createMesh(tank, silverMat, parent, -0.2, 0.2, 0);
    const flame = new THREE.ConeGeometry(0.1, 0.3);
    const fMat = new THREE.MeshBasicMaterial({color: 0xFFA500});
    createMesh(flame, fMat, parent, 0.2, -0.3, 0);
    createMesh(flame, fMat, parent, -0.2, -0.3, 0);
}

// Limbs & Animation Logic
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

    const aGroup1 = createLimbGroup(torso, 0.6, 0.3, 0);
    createMesh(jointGeo, darkMat, aGroup1, 0, 0, 0);
    const aGroup2 = createLimbGroup(torso, -0.6, 0.3, 0);
    createMesh(jointGeo, darkMat, aGroup2, 0, 0, 0);
    
    const armGeo = new RoundedBoxGeometry(0.15, 0.5, 0.15, 2, 0.05);
    const a1 = createMesh(armGeo, primMat, aGroup1, 0, -0.25, 0);
    const a2 = createMesh(armGeo, primMat, aGroup2, 0, -0.25, 0);
    createMesh(new THREE.SphereGeometry(0.12), darkMat, a1, 0, -0.3, 0);
    createMesh(new THREE.SphereGeometry(0.12), darkMat, a2, 0, -0.3, 0);
    animatedParts.arms.push({ mesh: aGroup1, phase: Math.PI });
    animatedParts.arms.push({ mesh: aGroup2, phase: 0 });
}

// --- GROUNDING LOGIC (FIX SINKING) ---
function snapToFloor() {
    // 1. Lift up first to clear the ground to ensure bounding box isn't buried
    if (bodyType !== 'FLOATING') {
        charGroup.position.y = 2.0;
    }
    
    scene.updateMatrixWorld(true);
    
    // 2. Calculate real bounding box
    const box = new THREE.Box3().setFromObject(charGroup);
    const minY = box.min.y;
    
    // 3. Surface at 0,0 is approx -0.5 (Ground -2 + Hill 1.5)
    // We want feet (minY) to be precisely at this level
    const TARGET_FLOOR_Y = -0.5;
    
    if (bodyType !== 'FLOATING') {
        const shift = TARGET_FLOOR_Y - minY;
        charGroup.position.y += shift;
        // Small sink for weight feeling
        charGroup.position.y -= 0.05;
    }
}
// Run once immediately after creation
snapToFloor();


// --- INFINITE GRID SYSTEM ---
const props = new THREE.Group();
scene.add(props);

function addTree(x, z) {
    const h = 2 + Math.random();
    createMesh(new RoundedBoxGeometry(0.3, h, 0.3, 1, 0.05), woodMat, props, x, h/2, z);
    createMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.1), leafMat, props, x, h+0.4, z);
}
function addBush(x, z) { createMesh(new RoundedBoxGeometry(0.6, 0.5, 0.6, 2, 0.1), leafMat, props, x, 0.25, z); }
function addRock(x, z) { createMesh(new RoundedBoxGeometry(0.5, 0.4, 0.5, 2, 0.1), rockMat, props, x, 0.2, z); }
function addCrystal(x, z) { createMesh(new THREE.ConeGeometry(0.3, 1, 4), crystalMat, props, x, 0.5, z); }
function addMushroom(x, z) { 
    createMesh(new THREE.CylinderGeometry(0.1, 0.15, 0.4), woodMat, props, x, 0.2, z);
    createMesh(new THREE.ConeGeometry(0.4, 0.3, 8), secMat, props, x, 0.5, z);
}

let currentBiomeFuncs = [addTree, addBush]; 

// Initial Prop Spawn
for(let i=0; i<50; i++) {
    const x = (Math.random()-0.5) * 50;
    const z = -10 - (Math.random() * 70); 
    if (Math.abs(x) < 2) continue; 
    const fn = currentBiomeFuncs[Math.floor(Math.random()*currentBiomeFuncs.length)];
    fn(x, z);
}

const particlesGeo = new THREE.BufferGeometry();
const particleCount = 150;
const pPos = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount; i++) {
    pPos[i*3] = (Math.random()-0.5)*40;
    pPos[i*3+1] = Math.random()*10;
    pPos[i*3+2] = (Math.random()-0.5)*40;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particlesMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.6 });
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// --- EMOTE BILLBOARD ---
const emoteCanvas = document.createElement('canvas');
emoteCanvas.width = 128; emoteCanvas.height = 128;
const emoteCtx = emoteCanvas.getContext('2d');
const emoteTexture = new THREE.CanvasTexture(emoteCanvas);
const emoteMat = new THREE.SpriteMaterial({ map: emoteTexture, transparent: true });
const emoteSprite = new THREE.Sprite(emoteMat);
emoteSprite.scale.set(2, 2, 1);
emoteSprite.position.set(0, 2, 0); // Above head
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
    emoteSprite.position.y = 2;
}

// Render immediately to avoid blank frame
renderer.render(scene, camera);

const clock = new THREE.Clock();
let isBattle = false;
let currentAction = 'WALK';
let isMoving = true; // Used for Walk/Idle cycle

const targetCamPos = new THREE.Vector3();

window.addEventListener('message', (e) => {
    if (e.data.type === 'SET_THEME') {
        const theme = e.data.value;
        let col = 0x6BCB77;
        if(theme === 'Fire') { 
            scene.background.set(0xFFEDD5); scene.fog.color.set(0xFFEDD5); col = 0xFDBA74; leafMat.color.setHex(0xB45309); 
            currentBiomeFuncs = [addRock, addCrystal]; particlesMat.color.setHex(0xFF4500); 
        }
        else if(theme === 'Water') { 
            scene.background.set(0xDBEAFE); scene.fog.color.set(0xDBEAFE); col = 0x93C5FD; leafMat.color.setHex(0x1E40AF);
            currentBiomeFuncs = [addRock, addMushroom]; particlesMat.color.setHex(0x00FFFF);
        }
        else if(theme === 'Electric') { 
            scene.background.set(0xFEF9C3); scene.fog.color.set(0xFEF9C3); col = 0xFDE047; leafMat.color.setHex(0xEAB308);
            currentBiomeFuncs = [addCrystal, addTree]; particlesMat.color.setHex(0xFFFF00);
        }
        else if(theme === 'Metal') { 
            scene.background.set(0xF1F5F9); scene.fog.color.set(0xF1F5F9); col = 0xCBD5E1; leafMat.color.setHex(0x64748B);
            currentBiomeFuncs = [addRock, addBush]; particlesMat.color.setHex(0xAAAAAA);
        }
        else if(theme === 'Dark') { 
            scene.background.set(0x312E81); scene.fog.color.set(0x312E81); col = 0x1E1B4B; leafMat.color.setHex(0x4338CA);
            currentBiomeFuncs = [addMushroom, addCrystal]; particlesMat.color.setHex(0x800080);
        }
        else { 
            scene.background.set(0xD1FAE5); scene.fog.color.set(0xD1FAE5); col = 0x6BCB77; leafMat.color.setHex(0x15803D);
            currentBiomeFuncs = [addTree, addBush]; particlesMat.color.setHex(0xFFFFFF);
        }
        groundMat.map = createGroundTexture(col);
        groundMat.needsUpdate = true;
    }
    if (e.data.type === 'PAUSE') { if (e.data.value) clock.stop(); else clock.start(); }
    if (e.data.type === 'SET_ACTION') { currentAction = e.data.value; }
    if (e.data.type === 'SET_EQUIPMENT') {
        const equip = e.data.value || {};
        if (equip.head) { clearSlot(headSlot); if(equip.head.includes('crown')) buildCrown(headSlot); if(equip.head.includes('visor')) buildVisor(headSlot); if(equip.head.includes('iron')) buildHelmetIron(headSlot); }
        if (equip.accessory) { clearSlot(backSlot); if(equip.accessory.includes('wings')) buildWingsAngel(backSlot); if(equip.accessory.includes('pack')) buildJetpack(backSlot); }
    }
    if (e.data.type === 'PRE_EVENT') {
        isMoving = false; // STOP
        currentAction = 'SCAN';
        showEmote(e.data.value || '!');
    }
    if (e.data.type === 'SET_MODE') {
        if (e.data.value.startsWith('BATTLE')) {
            isBattle = true;
            isMoving = false;
            emoteSprite.visible = false; // Hide emote
            controls.enabled = false;
            if (e.data.value === 'BATTLE_PLAYER') {
                targetCamPos.set(4, 3, 5);
                charGroup.rotation.y = Math.PI / 3;
            } else {
                targetCamPos.set(-4, 3, 5);
                charGroup.rotation.y = -Math.PI / 3;
            }
        } else {
            isBattle = false;
            isMoving = true;
            emoteSprite.visible = false;
            controls.enabled = true;
            props.visible = true;
            particles.visible = true;
            charGroup.rotation.y = 0;
            targetCamPos.set(5, 4, 12);
        }
    }
});

function lerp(start, end, t) { return start * (1 - t) + end * t; }

// --- STATE MACHINE FOR WALK / IDLE CYCLE ---
let cycleTimer = 0;
const WALK_DURATION = 15; 
const IDLE_DURATION = 8;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const delta = clock.getDelta();
    
    if (emoteSprite.visible) {
        emoteSprite.position.y = 2 + Math.abs(Math.sin(t * 5)) * 0.3;
    }

    if (!isBattle) {
        // CYCLE LOGIC
        if (currentAction !== 'SCAN') {
            cycleTimer += delta;
            if (isMoving && cycleTimer > WALK_DURATION) {
                isMoving = false;
                cycleTimer = 0;
                window.parent.postMessage({ type: 'ENTER_IDLE' }, '*');
            } else if (!isMoving && cycleTimer > IDLE_DURATION) {
                isMoving = true;
                cycleTimer = 0;
                window.parent.postMessage({ type: 'ENTER_WALK' }, '*');
            }
        }

        if (isMoving) {
             // --- TREADMILL ACTIVE ---
             const speed = 8.0 * delta;
             for (let i = props.children.length - 1; i >= 0; i--) {
                const prop = props.children[i];
                prop.position.z += speed; 
                if (prop.position.z > 15) { 
                    prop.position.z = -80; 
                    prop.position.x = (Math.random()-0.5) * 50;
                    if (Math.abs(prop.position.x) < 2) prop.position.x += 4;
                }
            }
            if(groundMat.map) groundMat.map.offset.y -= speed * 0.1;
            
            // Reset Head
            if (!userInteracting) headGroup.rotation.set(0,0,0);

        } else {
            // --- IDLE MODE ---
            // Smart Head Tracking (Camera Aware)
             if (!userInteracting) {
                const cameraDir = camera.position.clone().sub(charGroup.position).normalize();
                const dot = cameraDir.z; // Check if camera is in front
                
                if (dot > 0.2) { // Only track if camera is generally in front
                    const lookTarget = camera.position.clone();
                    lookTarget.y -= 1;
                    headGroup.lookAt(lookTarget);
                    headGroup.rotation.x = THREE.MathUtils.clamp(headGroup.rotation.x, -0.5, 0.5);
                    headGroup.rotation.y = THREE.MathUtils.clamp(headGroup.rotation.y, -0.8, 0.8);
                    headGroup.rotation.z = 0; 
                } else {
                    // Reset head smoothly
                    headGroup.rotation.x = lerp(headGroup.rotation.x, 0, 0.1);
                    headGroup.rotation.y = lerp(headGroup.rotation.y, 0, 0.1);
                }
            }
            // Breathing Animation
            torso.scale.y = 1.0 + Math.sin(t * 2) * 0.02; 
        }

        // --- LIMB ANIMATIONS ---
        if (currentAction === 'JUMP') {
             torso.position.y = Math.sin(t * 20) * 0.2;
        } else if (currentAction === 'SCAN') {
             headGroup.rotation.y = Math.sin(t * 4) * 0.8;
        } else if (isMoving) {
             const limbSpeed = 12;
             if (bodyType !== 'FLOATING') {
                animatedParts.legs.forEach(l => { l.mesh.rotation.x = Math.sin(t * limbSpeed + l.phase) * 0.8; });
                animatedParts.arms.forEach(a => { 
                    a.mesh.rotation.x = Math.sin(t * limbSpeed + a.phase) * 0.8; 
                    a.mesh.rotation.z = Math.abs(Math.sin(t * limbSpeed)) * 0.1 + 0.1;
                    a.mesh.rotation.y = Math.sin(t * limbSpeed) * 0.1;
                });
            } else {
                charGroup.position.y += Math.sin(t * 2) * 0.005; 
            }
        } else {
             // Reset limbs for Idle
             if (bodyType !== 'FLOATING') {
                animatedParts.legs.forEach(l => { l.mesh.rotation.x = lerp(l.mesh.rotation.x, 0, 0.1); });
                animatedParts.arms.forEach(a => { a.mesh.rotation.x = lerp(a.mesh.rotation.x, 0, 0.1); a.mesh.rotation.z = lerp(a.mesh.rotation.z, 0.1, 0.1); });
             }
        }

    } else {
        // BATTLE MODE
        if (targetCamPos.x > 0) charGroup.rotation.y = Math.PI / 3; 
        else charGroup.rotation.y = -Math.PI / 3; 
        headGroup.rotation.set(0,0,0); 
        camera.position.lerp(targetCamPos, 0.05);
        controls.target.lerp(new THREE.Vector3(0, 1.5, 0), 0.1);
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
