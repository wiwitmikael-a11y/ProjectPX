
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VisualTraits, MonsterStage, Pixupet, AttachedPart } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- V1: STATIC ANALYSIS ---
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "A creative, RPG-style name." },
                element: { type: Type.STRING, description: "Fire, Water, Grass, Electric, Psychic, Metal, Dark, Light, Spirit, Toxic" },
                hp: { type: Type.INTEGER }, atk: { type: Type.INTEGER }, def: { type: Type.INTEGER }, spd: { type: Type.INTEGER },
                description: { type: Type.STRING },
                bodyType: { type: Type.STRING, description: "One of: BIPED, QUADRUPED, FLOATING, SERPENTINE" },
                visualTraits: {
                    type: Type.OBJECT,
                    properties: {
                        extractedColors: {
                            type: Type.OBJECT,
                            properties: { primary: { type: Type.STRING }, secondary: { type: Type.STRING }, accent: { type: Type.STRING } },
                            required: ["primary", "secondary", "accent"]
                        },
                        silhouetteMatrix: {
                            type: Type.ARRAY,
                            description: "A 16x16 binary grid. 1=solid, 0=empty.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["extractedColors", "silhouetteMatrix"]
                }
            },
            required: ["name", "element", "hp", "atk", "def", "spd", "description", "bodyType", "visualTraits"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    { text: `Create a Voxel Monster based on this image.
                    For 'silhouetteMatrix': Create a 16x16 PIXEL ART grid representing the shape.
                    ` }
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
                title: { type: Type.STRING },
                element: { type: Type.STRING },
                description: { type: Type.STRING },
                stats: {
                     type: Type.OBJECT,
                     properties: { hp: { type: Type.INTEGER }, atk: { type: Type.INTEGER }, def: { type: Type.INTEGER }, spd: { type: Type.INTEGER } }
                },
                visualTraits: {
                    type: Type.OBJECT,
                    properties: {
                        extractedColors: {
                            type: Type.OBJECT,
                            properties: { primary: { type: Type.STRING }, secondary: { type: Type.STRING }, accent: { type: Type.STRING } }
                        },
                        silhouetteMatrix: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `Generate a LEGENDARY BOSS MONSTER (Level ${playerLevel + 5}) for biome: ${biome}.
                Theme: Epic, Scary, Cybernetic, God-like.
                silhouetteMatrix must be a complex 16x16 voxel shape.
                ` }]
            },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });

        const text = response.text;
        if(!text) throw new Error("Failed to summon boss");
        return JSON.parse(text);

    } catch (e) {
        console.error("Boss Gen Error", e);
        return null;
    }
};

// --- V3: NARRATIVE COMBAT LOG ---
export const generateBattleCommentary = async (winner: string, loser: string, biome: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{ text: `Write a 1-sentence epic victory line. Winner: ${winner}, Loser: ${loser}, Biome: ${biome}. Tone: Anime/Sci-Fi.` }]
            }
        });
        return response.text || `${winner} defeated ${loser}!`;
    } catch (e) {
        return `${winner} defeated ${loser}!`;
    }
};

// --- V4: THE SINGULARITY (100% POTENTIAL) ---

// 1. SENTIENT PET CHAT
export const generatePetReaction = async (pet: Pixupet, context: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Fast response needed
            contents: {
                parts: [{ text: `Roleplay as a digital pet named ${pet.name}.
                Personality: ${pet.nature || 'Brave'}.
                Element: ${pet.element}.
                Current Status: HP ${pet.currentHp}/${pet.maxHp}, Hunger ${pet.hunger}.
                Context: ${context}.
                
                Write a SHORT (max 15 words) speech bubble reaction. Be expressive!` }]
            }
        });
        return response.text || "I am ready, master!";
    } catch (e) { return "System nominal."; }
};

// 2. INFINITE MISSION ENGINE
export const generateMission = async (playerLevel: number, locationName: string): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                targetName: { type: Type.STRING, description: "Name of the target to hunt or item to find" },
                difficulty: { type: Type.STRING, description: "Easy, Medium, Hard, Suicide" },
                rewards: { type: Type.STRING, description: "Text description of rewards" }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Needs logic
            contents: {
                parts: [{ text: `Act as a Cyberpunk Quest Giver. Generate a procedural mission for a Level ${playerLevel} player in ${locationName}.
                The mission should fit the lore of the location.
                ` }]
            },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

// 3. ARTIFACT ANALYSIS
export const analyzeArtifact = async (playerLevel: number): Promise<any> => {
    try {
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                lore: { type: Type.STRING },
                stats: { 
                    type: Type.OBJECT,
                    properties: { atk: { type: Type.INTEGER }, def: { type: Type.INTEGER }, spd: { type: Type.INTEGER } }
                }
            }
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `Generate a unique, powerful artifact item for a Level ${playerLevel} RPG character.
                Give it a cool Sci-Fi/Fantasy name and deep lore.` }]
            },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

/**
 * TITAN ENGINE V30
 */
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob', visualTraits?: VisualTraits, name?: string): string => {
    
    const rawMatrix = (visualTraits as any)?.silhouetteMatrix || [
        "0000000000000000", "0000001111000000", "0000111111110000", "0001111111111000",
        "0011111111111100", "0111111111111110", "0111111111111110", "1111111111111111",
        "1111111111111111", "0111111111111110", "0111111111111110", "0011111111111100",
        "0001111111111000", "0000111111110000", "0000001111000000", "0000000000000000"
    ];

    const safeHex = (hex: string | undefined, f: number) => { if (!hex) return f; try { return parseInt(hex.replace('#', '0x'), 16); } catch (e) { return f; } };
    const pCol = safeHex(visualTraits?.extractedColors?.primary, 0xF472B6);
    const sCol = safeHex(visualTraits?.extractedColors?.secondary, 0xFFFFFF);
    const aCol = safeHex(visualTraits?.extractedColors?.accent, 0x333333);

    let scale = 1.0;
    if (stage === 'Pro') scale = 1.3;
    if (stage === 'Elite') scale = 1.6;
    if (stage === 'Legend') scale = 2.0;
    if (stage === 'God') scale = 2.5;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; } canvas { display: block; width: 100%; height: 100%; outline: none; }</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let MODE = 'HABITAT'; 
let EDITOR_ACTIVE = false;
let SELECTED_PART_ID = null;

// --- BIOME PALETTES ---
const BIOMES = {
    'Grass': { skyTop: 0x60A5FA, skyBottom: 0xBFDBFE, ground: 0x4ADE80, fog: 0xBFDBFE, particles: 0xFFFFFF, envType: 'NATURE' },
    'City': { skyTop: 0x0F172A, skyBottom: 0x1E293B, ground: 0x334155, fog: 0x1E293B, particles: 0x00FFFF, envType: 'URBAN' },
    'Cyber': { skyTop: 0x000000, skyBottom: 0x2e0236, ground: 0x111827, fog: 0x2e0236, particles: 0x00FF00, envType: 'CYBER' },
    'Volcano': { skyTop: 0x450a0a, skyBottom: 0x7f1d1d, ground: 0x1f0505, fog: 0x450a0a, particles: 0xFCA5A5, envType: 'HELL' },
    'Valhalla': { skyTop: 0xFFFFFF, skyBottom: 0xFCD34D, ground: 0xFFFBEB, fog: 0xFDE68A, particles: 0xFFD700, envType: 'HEAVEN' },
    'Desert': { skyTop: 0x1e1b4b, skyBottom: 0x4338ca, ground: 0xD6D3D1, fog: 0x4338ca, particles: 0xE9D5FF, envType: 'CAVE' },
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 300);
const baseCamPos = new THREE.Vector3(0, 4, 12);
camera.position.copy(baseCamPos);

const renderer = new THREE.WebGLRenderer({ antialias: true });
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
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2 - 0.05; 
controls.target.set(0, 1.5, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); 
sunLight.position.set(10, 20, 10); 
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(${pCol}, 1.5); 
rimLight.position.set(-5, 5, -5); 
scene.add(rimLight);

const matPrimary = new THREE.MeshStandardMaterial({ color: ${pCol}, roughness: 0.3, metalness: 0.2 });
const matSecondary = new THREE.MeshStandardMaterial({ color: ${sCol}, roughness: 0.6 });
const matAccent = new THREE.MeshStandardMaterial({ color: ${aCol}, roughness: 0.3, emissive: ${aCol}, emissiveIntensity: 0.4 });
const matEnergy = new THREE.MeshStandardMaterial({ color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 1.5, toneMapped: false });
const matGold = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 1.0, emissive: 0xFFD700, emissiveIntensity: 0.2 });
const matVoid = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 });
const matGhost = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.5, wireframe: true });

const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

const bodyGroup = new THREE.Group(); 
const partsGroup = new THREE.Group(); 
charGroup.add(bodyGroup);
charGroup.add(partsGroup);
bodyGroup.position.y = 1.0; 
partsGroup.position.y = 1.0; 

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const groundGeo = new THREE.CylinderGeometry(60, 60, 2, 64);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4ADE80, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -1.0;
ground.receiveShadow = true;
worldGroup.add(ground);

const propsGroup = new THREE.Group();
worldGroup.add(propsGroup);

const vertexShader = \`
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}\`;
const fragmentShader = \`
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
    float h = normalize( vWorldPosition + offset ).y;
    gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 );
}\`;

const skyGeo = new THREE.SphereGeometry(100, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
    },
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(200 * 3);
for(let i=0; i<600; i++) pPos[i] = (Math.random() - 0.5) * 60;
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ size: 0.2, color: 0xFFFFFF, transparent: true, opacity: 0.6 });
const pSys = new THREE.Points(pGeo, pMat);
scene.add(pSys);

function spawnTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 2, 6), new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
    trunk.position.set(x, 0, z); trunk.castShadow = true;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x15803D }));
    leaves.position.set(x, 2, z); leaves.castShadow = true;
    propsGroup.add(trunk); propsGroup.add(leaves);
}
function spawnBuilding(x, z, h) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), new THREE.MeshStandardMaterial({ color: 0x1E293B, emissive: 0x000000 }));
    b.position.set(x, h/2-1, z); b.castShadow = true;
    const w = new THREE.Mesh(new THREE.BoxGeometry(2.05, h*0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xFDE047, emissiveIntensity: 0.8 }));
    w.position.set(x, h/2-1, z);
    propsGroup.add(b); propsGroup.add(w);
}
function spawnRock(x, z) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4B5563 }));
    r.position.set(x, -0.2, z); r.castShadow = true;
    propsGroup.add(r);
}

function generateEnvironment(type) {
    while(propsGroup.children.length > 0) propsGroup.remove(propsGroup.children[0]);
    const config = BIOMES[type] || BIOMES['Grass'];
    groundMat.color.setHex(config.ground);
    for(let i=0; i<20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 30;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        if(config.envType === 'NATURE') spawnTree(x, z);
        if(config.envType === 'URBAN' || config.envType === 'CYBER') spawnBuilding(x, z, 5 + Math.random()*10);
        if(config.envType === 'HELL') { spawnRock(x, z); if(Math.random()>0.5) spawnRock(x+1, z+1); }
        if(config.envType === 'HEAVEN') { 
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8, 8), matGold);
            pillar.position.set(x, 2, z);
            propsGroup.add(pillar);
        }
    }
}

function updateBiome(type, night) {
    const biome = BIOMES[type] || BIOMES['Grass'];
    const top = night ? 0x000011 : biome.skyTop;
    const bottom = night ? 0x000033 : biome.skyBottom;
    const fog = night ? 0x000033 : biome.fog;
    skyMat.uniforms.topColor.value.setHex(top);
    skyMat.uniforms.bottomColor.value.setHex(bottom);
    scene.fog = new THREE.FogExp2(fog, 0.012);
    renderer.setClearColor(fog);
    pMat.color.setHex(biome.particles);
    generateEnvironment(type);
}

const matrix = ${JSON.stringify(rawMatrix)};
const voxSize = 0.15;
const geoBox = new THREE.BoxGeometry(voxSize, voxSize, voxSize);
const coreVoxels = []; 

function buildVoxelMesh() {
    const width = 16; const height = 16;
    for (let y = 0; y < height; y++) {
        const row = matrix[y]; if(!row) continue;
        for (let x = 0; x < width; x++) {
            if (row[x] === '1') {
                let mat = matPrimary;
                if (y === 7 && (x === 6 || x === 9)) mat = matAccent;
                const mesh = new THREE.Mesh(geoBox, mat);
                mesh.position.set((x - 7.5) * voxSize, (15 - y - 7.5) * voxSize, 0);
                mesh.castShadow = true; mesh.receiveShadow = true;
                mesh.userData = { isVoxel: true };
                bodyGroup.add(mesh);
                coreVoxels.push(mesh);
            }
        }
    }
}
buildVoxelMesh();

function createPartGeometry(type) {
    const g = new THREE.Group();
    const addMesh = (geo, mat, pos={x:0,y:0,z:0}, rot={x:0,y:0,z:0}) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(pos.x,pos.y,pos.z); m.rotation.set(rot.x,rot.y,rot.z); m.castShadow=true; g.add(m); return m;
    };
    switch(type) {
        case 'LEG_BASIC': addMesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPrimary, {x:0,y:-0.25,z:0}); break;
        case 'ARM_STUBBY': addMesh(new THREE.SphereGeometry(0.2, 8, 8), matPrimary, {x:0,y:0,z:0.1}); break;
        case 'SHOE_ROUND': addMesh(new THREE.SphereGeometry(0.25, 12, 12), matAccent, {x:0,y:-0.2,z:0}).scale.set(1, 0.8, 1.5); break;
        case 'SENSOR': addMesh(new THREE.BoxGeometry(0.25, 0.25, 0.15), matAccent, {x:0,y:0,z:0.1}); break;
        case 'SPIKE': addMesh(new THREE.ConeGeometry(0.15, 0.6, 8), matAccent, {x:0,y:0,z:0.3}, {x:Math.PI/2,y:0,z:0}); break;
        case 'TRACKS': addMesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), matSecondary, {x:0,y:-0.2,z:0}); break;
        case 'LEG_MECH': addMesh(new THREE.CylinderGeometry(0.1, 0.05, 0.6), matSecondary, {x:0,y:-0.3,z:0}); break;
        case 'CANNON': addMesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8), matSecondary, {x:0,y:0,z:0.4}, {x:Math.PI/2,y:0,z:0}); break;
        case 'HALO': addMesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), matEnergy, {x:0,y:0.5,z:0}, {x:Math.PI/2,y:0,z:0}); break;
        case 'EARS_CAT': addMesh(new THREE.ConeGeometry(0.15, 0.4, 4), matPrimary, {x:-0.2,y:0.2,z:0}); addMesh(new THREE.ConeGeometry(0.15, 0.4, 4), matPrimary, {x:0.2,y:0.2,z:0}); break;
        case 'WINGS_GOD': addMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), matGold, {x:0.8,y:0.5,z:0}, {x:0,y:0,z:-Math.PI/4}); break;
        case 'KATANA': addMesh(new THREE.BoxGeometry(0.05, 1.2, 0.02), matEnergy, {x:0,y:0.6,z:0.15}); break;
        case 'DRILL': addMesh(new THREE.ConeGeometry(0.2, 1.0, 16), matSecondary, {x:0,y:0,z:0.5}, {x:Math.PI/2,y:0,z:0}); break;
        case 'CANNON_VOID': addMesh(new THREE.SphereGeometry(0.4), matVoid); addMesh(new THREE.TorusGeometry(0.5,0.02,8,24), matEnergy); break;
        default: addMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matGhost); break;
    }
    return g;
}

function renderAttachedParts(partsList) {
    while(partsGroup.children.length > 0) partsGroup.remove(partsGroup.children[0]);
    if(!partsList) return;
    partsList.forEach(p => {
        const mesh = createPartGeometry(p.partType);
        mesh.position.set(p.position.x, p.position.y, p.position.z);
        const target = new THREE.Vector3(p.position.x+p.faceNormal.x, p.position.y+p.faceNormal.y, p.position.z+p.faceNormal.z);
        mesh.lookAt(target);
        partsGroup.add(mesh);
    });
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const ghostCursor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matGhost);
scene.add(ghostCursor); ghostCursor.visible = false;

window.addEventListener('mousemove', (e) => {
    if(!EDITOR_ACTIVE) return;
    mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(coreVoxels);
    if(intersects.length>0) {
        const hit = intersects[0];
        ghostCursor.position.copy(hit.object.position).add(hit.face.normal.clone().multiplyScalar(voxSize*0.6));
        ghostCursor.visible = true;
    } else ghostCursor.visible = false;
});

window.addEventListener('pointerdown', () => {
    if(!EDITOR_ACTIVE || !ghostCursor.visible || !SELECTED_PART_ID) return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(coreVoxels);
    if(intersects.length > 0) {
        const hit = intersects[0];
        window.parent.postMessage({ type: 'PART_PLACED', partId: SELECTED_PART_ID, position: hit.object.position, normal: hit.face.normal }, '*');
    }
});

const clock = new THREE.Clock();
let currentAction = 'WALK';
let shakeIntensity = 0;

window.addEventListener('message', (e) => {
    const d = e.data;
    if(d.type === 'SET_MODE') { MODE = d.value; EDITOR_ACTIVE = (MODE === 'ENGINEER'); controls.autoRotate = false; if(MODE==='ENGINEER') camera.position.set(0,3,6); }
    if(d.type === 'SET_PART_SELECTION') SELECTED_PART_ID = d.partId;
    if(d.type === 'SET_EQUIPMENT' && d.value?.parts) renderAttachedParts(d.value.parts);
    if(d.type === 'SET_ACTION') { 
        currentAction = d.value; 
        if(currentAction === 'SHAKE') { shakeIntensity = 0.5; setTimeout(()=>shakeIntensity=0, 300); }
    }
    if(d.type === 'SET_ENV_DATA') updateBiome(d.payload.envType, d.payload.isNight);
});

updateBiome('Grass', false);

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    controls.update();
    rimLight.intensity = 2.0 + Math.sin(time * 2) * 0.5;
    if(shakeIntensity > 0) {
        camera.position.x = baseCamPos.x + (Math.random()-0.5)*shakeIntensity;
        camera.position.y = baseCamPos.y + (Math.random()-0.5)*shakeIntensity;
        camera.position.z = baseCamPos.z + (Math.random()-0.5)*shakeIntensity;
    } else if(!controls.autoRotate && MODE!=='ENGINEER') camera.position.lerp(baseCamPos, 0.1);

    if(bodyGroup && MODE!=='ENGINEER') {
        const bounce = Math.sin(time * (currentAction==='RUN'?10:3)) * 0.1;
        bodyGroup.position.y = 1.0 + bounce;
        partsGroup.position.y = 1.0 + bounce;
        if(currentAction==='ATTACK') {
             const ph = (Date.now()%1000)/1000;
             charGroup.position.z = (ph<0.2) ? -2.0 * (ph*5) : THREE.MathUtils.lerp(charGroup.position.z, 0, 0.1);
        } else charGroup.position.z = 0;
    }
    worldGroup.rotation.y = Math.sin(time*0.05)*0.05;
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
</script>
</body>
</html>`;
}
