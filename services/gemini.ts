/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VisualTraits, MonsterStage, Pixupet, AttachedPart } from "./gameData";

// --- API KEY SAFEGUARD ---
// Use process.env.API_KEY directly as per @google/genai coding guidelines.
// Assume this variable is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- V1: ANIME-STYLE ANALYSIS ---
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                element: { type: Type.STRING },
                hp: { type: Type.INTEGER }, atk: { type: Type.INTEGER }, def: { type: Type.INTEGER }, spd: { type: Type.INTEGER },
                description: { type: Type.STRING },
                anatomy: {
                    type: Type.OBJECT,
                    properties: {
                        headShape: { type: Type.STRING, description: "ROW1: ROUND, OVAL, SQUARE. ROW2: CAT, FOX, WOLF. ROW3: DRAGON, LIZARD, TV. ROW4: SKULL, FLOWER, GHOST" },
                        bodyShape: { type: Type.STRING, description: "ROW1: ORB, PEAR, BOX. ROW2: HUMANOID, MUSCLE, SLIM. ROW3: QUAD, SERPENT, FLOATING" },
                        limbStyle: { type: Type.STRING, description: "ROW1: NUBS, PAWS, HOOVES. ROW2: BOOTS, CLAWS, TALONS. ROW3: MECH, WHEELS, NONE" },
                        tailStyle: { type: Type.STRING, description: "ROW1: NONE, CAT, FOX. ROW2: LIZARD, DEVIL, FISH. ROW3: MECH_PLUG, STINGER, GHOST" },
                        wingStyle: { type: Type.STRING, description: "ROW1: NONE, FEATHER, BAT. ROW2: BUTTERFLY, MECH, CRYSTAL. ROW3: CAPE, SCARF, SPIKES" },
                        eyeStyle: { type: Type.STRING, description: "ANIME_LARGE, CYCLOPS, VISOR, DOTS, GLOW_SLIT" },
                        primaryColor: { type: Type.STRING, description: "Hex Code" },
                        secondaryColor: { type: Type.STRING, description: "Hex Code" },
                        accentColor: { type: Type.STRING, description: "Hex Code" },
                    },
                    required: ["headShape", "bodyShape", "limbStyle", "tailStyle", "wingStyle", "primaryColor", "secondaryColor", "accentColor"]
                },
                sculptParams: {
                    type: Type.OBJECT,
                    properties: {
                        roughness: { type: Type.NUMBER, description: "0 to 1. 0=Smooth, 1=Hairy/Scaly" },
                        sharpness: { type: Type.NUMBER, description: "0 to 1. 0=Round, 1=Angular/Mechanical" },
                        distortion: { type: Type.NUMBER, description: "0 to 1. Organic variability" }
                    }
                }
            },
            required: ["name", "element", "hp", "atk", "def", "spd", "description", "anatomy"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    { text: `Analyze this image as a High-End Anime 3D Character. Map anatomy for a procedural rigger.` }
                ]
            },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);

    } catch (error) {
        console.error("Analysis Error", error);
        return null;
    }
};

// --- V2: INFINITE BOSS GENERATOR ---
export const generateProceduralBoss = async (biome: string, playerLevel: number): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                element: { type: Type.STRING },
                description: { type: Type.STRING },
                stats: {
                     type: Type.OBJECT,
                     properties: { hp: { type: Type.INTEGER }, atk: { type: Type.INTEGER }, def: { type: Type.INTEGER }, spd: { type: Type.INTEGER } }
                },
                anatomy: {
                    type: Type.OBJECT,
                    properties: {
                        headShape: { type: Type.STRING, description: "DRAGON, SKULL, TV, WOLF, MECH" },
                        bodyShape: { type: Type.STRING, description: "MUSCLE, SERPENT, FLOATING, QUAD, HUMANOID" },
                        limbStyle: { type: Type.STRING }, tailStyle: { type: Type.STRING }, wingStyle: { type: Type.STRING },
                        eyeStyle: { type: Type.STRING },
                        primaryColor: { type: Type.STRING },
                        secondaryColor: { type: Type.STRING },
                        accentColor: { type: Type.STRING }
                    },
                    required: ["headShape", "bodyShape", "primaryColor"]
                },
                sculptParams: { type: Type.OBJECT, properties: { roughness: { type: Type.NUMBER }, sharpness: { type: Type.NUMBER }, distortion: { type: Type.NUMBER } } }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `Generate a GOD-TIER ANIME BOSS (Level ${playerLevel + 5}) for biome: ${biome}. Visuals should be Digimon/Pokemon Mega Evolution level.` }]
            },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });

        const text = response.text;
        if(!text) throw new Error("Failed to summon boss");
        return JSON.parse(text);

    } catch (e) {
        return null;
    }
};

// --- UTILS ---
export const generateBattleCommentary = async (winner: string, loser: string, biome: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Write a 1-sentence epic anime victory line. Winner: ${winner}, Loser: ${loser}.` }] }
        });
        return response.text || `${winner} defeated ${loser}!`;
    } catch (e) { return `${winner} defeated ${loser}!`; }
};

export const generatePetReaction = async (pet: Pixupet, context: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Roleplay as ${pet.name}. Context: ${context}. Max 6 words.` }] }
        });
        return response.text || "I am ready!";
    } catch (e) { return "..."; }
};

export const generateMission = async (playerLevel: number, locationName: string): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, targetName: { type: Type.STRING }, difficulty: { type: Type.STRING }, rewards: { type: Type.STRING }, goal: { type: Type.INTEGER } }
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: `Generate RPG mission for Lvl ${playerLevel} in ${locationName}.` }] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const analyzeArtifact = async (playerLevel: number): Promise<any> => {
    try {
        const responseSchema: Schema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, lore: { type: Type.STRING } } };
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: `Generate rare artifact item name and lore.` }] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

/**
 * THE TITAN ENGINE (Physics-Based Rigging & Anime Sculpting)
 */
export const getGenericVoxel = (element: string, bodyType: string, stage: string, visualTraits: any, name: string): string => {
    
    const anatomy = (visualTraits as any)?.anatomy || {
        headShape: 'ROUND', bodyShape: 'ORB', limbStyle: 'NUBS', tailStyle: 'NONE', wingStyle: 'NONE',
        eyeStyle: 'ANIME_LARGE', primaryColor: '#F472B6', secondaryColor: '#FFFFFF', accentColor: '#333333'
    };

    const sculpt = (visualTraits as any)?.sculptParams || { roughness: 0.1, sharpness: 0.1, distortion: 0.0 };

    let scale = 1.0;
    if (stage === 'Pro') scale = 1.3;
    if (stage === 'Elite') scale = 1.6;
    if (stage === 'Legend') scale = 2.0;
    if (stage === 'God') scale = 2.5;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; } canvas { display: block; outline: none; }</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DATA = ${JSON.stringify(anatomy)};
const SCULPT = ${JSON.stringify(sculpt)};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 300);
camera.position.set(0, 3, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 6; controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Ground collision check
controls.target.set(0, 1.8, 0);

// --- MATERIALS (Anime Shader V2) ---
// Emulating a "Toon" look with sharp terminators using basic MeshToonMaterial config
const toonMat = (color, emit = 0.0) => {
    return new THREE.MeshToonMaterial({ 
        color: color,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: emit
    });
};
const matPrimary = toonMat(DATA.primaryColor, 0.1);
const matSecondary = toonMat(DATA.secondaryColor);
const matAccent = toonMat(DATA.accentColor, 0.3);
const matBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
const matWhite = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

// --- UTILS: OUTLINE ---
function createOutline(geometry, thickness = 0.02, color = 0x000000) {
    const outlineMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.BackSide });
    const outlineMesh = new THREE.Mesh(geometry, outlineMat);
    outlineMesh.scale.multiplyScalar(1 + thickness);
    return outlineMesh;
}

// --- LIGHTING (Studio Setup) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2); 
mainLight.position.set(5, 12, 8); mainLight.castShadow = true;
// Soften shadows
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
mainLight.shadow.bias = -0.001;
scene.add(mainLight);

// Rim Light for Anime Edge
const rimLight = new THREE.SpotLight(DATA.accentColor, 5.0);
rimLight.position.set(-8, 6, -5); rimLight.lookAt(0,0,0);
scene.add(rimLight);

const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

// ==========================================================
//    TITAN ENGINE: VERTEX DEFORMATION & SCULPTING
// ==========================================================

function deformGeometry(geometry, callback) {
    const posAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const center = new THREE.Vector3();
    geometry.computeBoundingBox();
    geometry.boundingBox.getCenter(center);

    for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        // Normalize relative to center for symmetrical sculpting
        const localX = vertex.x - center.x;
        const localY = vertex.y - center.y;
        const localZ = vertex.z - center.z;
        
        callback(vertex, localX, localY, localZ);
        posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
}

// --- ANATOMY BUILDERS ---

function createHead() {
    const g = new THREE.Group();
    const type = DATA.headShape;
    let geo = new THREE.SphereGeometry(1, 48, 48); // High poly for sculpting

    // ADVANCED SCULPTING
    deformGeometry(geo, (v, x, y, z) => {
        // Global Taper (Anime Chin)
        if (y < -0.2) {
             const factor = 1 - Math.abs(y+0.2)*0.5;
             v.x *= factor; v.z *= factor; 
        }
        
        if (type === 'FOX' || type === 'WOLF') {
            if (z > 0.4 && Math.abs(x) < 0.5 && y < 0.2) { v.z += 0.4; v.y -= 0.1; } // Snout
            if (Math.abs(x) > 0.6 && y > 0.3) { v.y += 0.3; v.x *= 1.1; } // Ears base hint
        }
        else if (type === 'DRAGON' || type === 'LIZARD') {
             if (z > 0.3) { v.z += 0.5; v.y *= 0.6; } // Long snout
             if (y > 0.5) { v.x *= 0.8; } // Narrow crest
        }
        else if (type === 'CAT') {
             if (y < -0.4) { v.y += 0.2; } // Flat chin
             if (Math.abs(x) > 0.7) v.x *= 1.2; // Wide cheeks
        }
        else if (type === 'MECH' || type === 'TV') {
             // Cube-ify
             v.x = Math.sign(x) * Math.pow(Math.abs(x), 0.3) * 0.9;
             v.y = Math.sign(y) * Math.pow(Math.abs(y), 0.3) * 0.9;
             v.z = Math.sign(z) * Math.pow(Math.abs(z), 0.3) * 0.9;
        }
    });

    const headMesh = new THREE.Mesh(geo, matPrimary);
    g.add(headMesh);
    g.add(createOutline(geo));

    // EYES (Anime Style)
    const eyeGroup = new THREE.Group();
    const eyeGeo = (DATA.eyeStyle === 'DOTS') 
        ? new THREE.SphereGeometry(0.15, 16, 16) 
        : new THREE.CapsuleGeometry(0.22, 0.2, 4, 8);
    
    if (DATA.eyeStyle === 'VISOR') {
        const visorGeo = new THREE.BoxGeometry(1.6, 0.4, 0.5);
        deformGeometry(visorGeo, (v) => { v.z += Math.cos(v.x)*0.2; }); // Curve
        const visor = new THREE.Mesh(visorGeo, new THREE.MeshBasicMaterial({color: 0x00ff00}));
        visor.position.set(0, 0.1, 0.8);
        g.add(visor);
    } else {
        const leftEye = new THREE.Mesh(eyeGeo, matBlack);
        leftEye.rotation.z = Math.PI/2;
        leftEye.position.set(-0.4, 0.1, 0.85);
        if(type==='DRAGON') leftEye.position.z = 1.1;
        
        // Pupil/Shine
        const shine = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), matWhite);
        shine.position.set(0.05, 0.05, 0.15); // Slightly forward
        leftEye.add(shine);
        
        const rightEye = leftEye.clone();
        rightEye.position.x = -leftEye.position.x;
        
        eyeGroup.add(leftEye); eyeGroup.add(rightEye);
        g.add(eyeGroup);
    }

    // EARS/HORNS (Attachments)
    if(type === 'CAT' || type === 'FOX' || type === 'WOLF') {
        const earGeo = new THREE.ConeGeometry(0.35, 0.7, 4);
        const lEar = new THREE.Mesh(earGeo, matPrimary);
        lEar.position.set(-0.6, 0.8, 0.2); lEar.rotation.set(-0.2, 0, 0.5);
        const rEar = lEar.clone(); rEar.position.set(0.6, 0.8, 0.2); rEar.rotation.set(-0.2, 0, -0.5);
        g.add(lEar); g.add(rEar);
    }

    return g;
}

// --- SOCKET-BASED LIMB SYSTEM ---

function createLimb(width, length, style) {
    const group = new THREE.Group();
    
    // Joint pivot (Shoulder/Hip)
    const joint = new THREE.Group();
    group.add(joint);

    // Upper Limb
    const upGeo = new THREE.CapsuleGeometry(width, length/2, 4, 8);
    upGeo.translate(0, -length/4, 0); // Pivot at top
    const upper = new THREE.Mesh(upGeo, matSecondary);
    joint.add(upper);

    // Lower Limb (Forearm/Shin)
    const lowGeo = new THREE.CapsuleGeometry(width*0.8, length/2, 4, 8);
    lowGeo.translate(0, -length/4, 0);
    const lower = new THREE.Mesh(lowGeo, matSecondary);
    lower.position.y = -length/2; // Attach to bottom of upper
    upper.add(lower);

    // Hand/Foot
    let footGeo;
    if (style === 'HOOVES') footGeo = new THREE.BoxGeometry(width*1.2, width, width*1.2);
    else if (style === 'CLAWS') footGeo = new THREE.ConeGeometry(width, width*2, 4);
    else footGeo = new THREE.SphereGeometry(width*1.2, 8, 8); // Paws/Nubs

    const foot = new THREE.Mesh(footGeo, matAccent);
    foot.position.y = -length/2;
    if(style === 'CLAWS') foot.rotation.x = -Math.PI/2;
    lower.add(foot);

    return { root: group, joint: joint, lower: lower, foot: foot };
}

// --- ASSEMBLY ---

const rig = { root: null, spine: null, head: null, legs: [], arms: [], tail: null };

function assemble() {
    const type = DATA.bodyShape;
    const limbStyle = DATA.limbStyle;

    // 1. CHASSIS
    let bodyGeo;
    if(type === 'HUMANOID' || type === 'MUSCLE') bodyGeo = new THREE.CapsuleGeometry(0.7, 1.2, 8, 16);
    else if(type === 'QUAD') bodyGeo = new THREE.CapsuleGeometry(0.7, 1.5, 8, 16);
    else if(type === 'BOX') bodyGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    else bodyGeo = new THREE.SphereGeometry(1.0, 32, 32); // Orb/Pear

    if(type === 'PEAR') deformGeometry(bodyGeo, (v,x,y,z) => { if(y<0) v.x *= 1.5; v.z *= 1.2; });
    if(type === 'QUAD') { 
        // Horizontal capsule
        bodyGeo = new THREE.CapsuleGeometry(0.7, 1.4, 8, 16);
        const qMesh = new THREE.Mesh(bodyGeo, matPrimary);
        qMesh.rotation.x = Math.PI/2;
        charGroup.add(qMesh);
        rig.root = qMesh;
        rig.root.position.y = 1.5;
    } else {
        const bMesh = new THREE.Mesh(bodyGeo, matPrimary);
        charGroup.add(bMesh);
        rig.root = bMesh;
        rig.root.position.y = (type==='HUMANOID') ? 2.0 : 1.5;
    }

    rig.root.add(createOutline(bodyGeo));

    // 2. HEAD ATTACHMENT
    rig.head = createHead();
    if(type === 'QUAD') {
        rig.head.position.set(0, 0.4, 1.0); // Front of quad
    } else if(type === 'SERPENT') {
        rig.head.position.set(0, 0, 0); // Serpent handles logic separately
    } else {
        rig.head.position.set(0, (type==='HUMANOID'?0.8:0.8), 0);
    }
    rig.root.add(rig.head);

    // 3. LIMBS (Socket Logic)
    if(type === 'HUMANOID' || type === 'MUSCLE' || type === 'BOX') {
        // Legs
        const lLeg = createLimb(0.25, 1.6, limbStyle);
        lLeg.root.position.set(-0.4, -0.5, 0);
        rig.root.add(lLeg.root); rig.legs.push(lLeg);
        
        const rLeg = createLimb(0.25, 1.6, limbStyle);
        rLeg.root.position.set(0.4, -0.5, 0);
        rig.root.add(rLeg.root); rig.legs.push(rLeg);

        // Arms
        const lArm = createLimb(0.2, 1.3, limbStyle);
        lArm.root.position.set(-0.8, 0.4, 0);
        lArm.joint.rotation.z = 0.5; // Natural A-pose
        rig.root.add(lArm.root); rig.arms.push(lArm);

        const rArm = createLimb(0.2, 1.3, limbStyle);
        rArm.root.position.set(0.8, 0.4, 0);
        rArm.joint.rotation.z = -0.5;
        rig.root.add(rArm.root); rig.arms.push(rArm);
    }
    else if(type === 'QUAD') {
        // 4 Legs
        const legPos = [
            {x:-0.5, y:0, z:0.6}, {x:0.5, y:0, z:0.6}, // Front
            {x:-0.5, y:0, z:-0.6}, {x:0.5, y:0, z:-0.6} // Back
        ];
        legPos.forEach(p => {
            const l = createLimb(0.22, 1.2, limbStyle);
            l.root.position.set(p.x, p.y, p.z);
            rig.root.add(l.root); rig.legs.push(l);
        });
    }

    // 4. TAIL
    if(DATA.tailStyle !== 'NONE' && type !== 'SERPENT') {
        const tailGeo = new THREE.ConeGeometry(0.2, 1.5, 8);
        deformGeometry(tailGeo, (v,x,y,z) => { v.x += Math.sin(y*2)*0.2; }); // Curve
        const tail = new THREE.Mesh(tailGeo, matSecondary);
        tail.position.set(0, -0.2, -0.7);
        tail.rotation.x = -1.2;
        rig.root.add(tail);
        rig.tail = tail;
    }
}
assemble();

// --- ENVIRONMENT (Procedural Terrain) ---
const envGroup = new THREE.Group();
scene.add(envGroup);

function updateEnvironment(type) {
    while(envGroup.children.length > 0) envGroup.remove(envGroup.children[0]);
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
    // Vertex displacement for hills
    const pos = floorGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i);
        const z = pos.getZ(i);
        // Safe center area
        const dist = Math.sqrt(x*x + y*y);
        if(dist > 5) {
            pos.setZ(i, Math.random() * 1.5); // Jagged hills
        }
    }
    floorGeo.computeVertexNormals();

    const color = (type==='Grass')?0x4ade80 : (type==='City')?0x1e293b : 0x7f1d1d;
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshToonMaterial({color: color}));
    floor.rotation.x = -Math.PI/2; 
    floor.receiveShadow = true;
    envGroup.add(floor);
}

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
let currentAction = 'IDLE';

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    controls.update();

    if(rig.root) {
        // 1. BREATHING (Vertical Bob)
        // Physics: When breathing in (up), body expands.
        const breath = Math.sin(t * 2);
        rig.root.position.y += breath * 0.002;
        
        // 2. IDLE STANCE (Phase Offset)
        // Arms sway slightly delayed from body
        rig.arms.forEach((arm, i) => {
             arm.joint.rotation.z = (i%2===0 ? 0.5 : -0.5) + Math.sin(t*2 + 1) * 0.05;
             arm.lower.rotation.z = Math.sin(t*2 + 2) * 0.1; // Forearm sway
        });

        // 3. IK SIMULATION (Fake Grounding)
        // When body goes down, bend knees to keep feet at y=0
        if(DATA.bodyShape === 'HUMANOID' || DATA.bodyShape === 'QUAD') {
            const bodyH = rig.root.position.y;
            // Simple logic: lower legs rotate opposite to upper legs to simulate compression
            const bend = Math.max(0, (2.0 - bodyH) * 1.5); 
            rig.legs.forEach(leg => {
                leg.lower.rotation.x = bend; 
            });
        }
    }

    // 4. ACTION STATES
    if (currentAction === 'RUN') {
        const speed = 12;
        rig.root.position.y += Math.sin(t * speed * 2) * 0.02; // Bouncy run
        
        rig.legs.forEach((leg, i) => {
            const offset = (i%2===0) ? 0 : Math.PI;
            leg.joint.rotation.x = Math.sin(t * speed + offset) * 0.8;
            leg.lower.rotation.x = Math.abs(Math.sin(t * speed + offset)) * 1.5; // Knee snap
        });
        
        rig.arms.forEach((arm, i) => {
            const offset = (i%2===0) ? Math.PI : 0;
            arm.joint.rotation.x = Math.sin(t * speed + offset) * 0.8;
        });
    }

    if (currentAction === 'ATTACK') {
        const impact = Math.sin(t * 15);
        if(rig.root) rig.root.rotation.y = impact * 0.2; // Shake
        rig.arms.forEach(arm => {
             arm.joint.rotation.x = -1.5; // Arms up
        });
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('message', (e) => {
    if(e.data.type === 'SET_ENV_DATA') updateEnvironment(e.data.payload.envType);
    if(e.data.type === 'SET_ACTION') currentAction = e.data.value;
});

window.addEventListener('resize', () => { 
    camera.aspect = window.innerWidth/window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
});

</script>
</body>
</html>`;
}