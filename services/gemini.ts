
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VisualTraits, MonsterStage, Pixupet, AttachedPart } from "./gameData";

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
                        headShape: { type: Type.STRING, description: "ROUND, CAT, FOX, DRAGON, MECH, SQUARE" },
                        bodyShape: { type: Type.STRING, description: "CHIBI_ROUND, TALL_HUMANOID, QUAD_BEAST, FLOATING_ORB, SERPENT" },
                        eyeStyle: { type: Type.STRING, description: "ANIME_LARGE, CYCLOPS, VISOR, DOTS, GLOW_SLIT" },
                        primaryColor: { type: Type.STRING, description: "Hex Code" },
                        secondaryColor: { type: Type.STRING, description: "Hex Code" },
                        accentColor: { type: Type.STRING, description: "Hex Code" },
                        hasWings: { type: Type.BOOLEAN },
                        hasTail: { type: Type.BOOLEAN },
                        hasHorns: { type: Type.BOOLEAN }
                    },
                    required: ["headShape", "bodyShape", "eyeStyle", "primaryColor", "secondaryColor", "accentColor"]
                }
            },
            required: ["name", "element", "hp", "atk", "def", "spd", "description", "anatomy"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    { text: `Analyze this image and design a 3D Anime/RPG Monster.
                    Focus on Shapes and Colors.
                    Return strict JSON anatomy.` }
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

// --- V2: INFINITE BOSS GENERATOR (ANIME STYLE) ---
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
                        headShape: { type: Type.STRING, description: "DRAGON, MECH, SKULL, CROWNED" },
                        bodyShape: { type: Type.STRING, description: "TITAN_HUMANOID, QUAD_BEAST, SERPENT_LORD, FLOATING_CORE" },
                        eyeStyle: { type: Type.STRING, description: "GLOW_SLIT, CYCLOPS, MULTI_EYE" },
                        primaryColor: { type: Type.STRING },
                        secondaryColor: { type: Type.STRING },
                        accentColor: { type: Type.STRING },
                        hasWings: { type: Type.BOOLEAN },
                        hasTail: { type: Type.BOOLEAN },
                        hasHorns: { type: Type.BOOLEAN }
                    },
                    required: ["headShape", "bodyShape", "primaryColor"]
                }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `Generate a LEGENDARY BOSS MONSTER (Level ${playerLevel + 5}) for biome: ${biome}.
                Style: Anime Boss, detailed, scary but cool colors.
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
                parts: [{ text: `Write a 1-sentence epic anime victory line. Winner: ${winner}, Loser: ${loser}.` }]
            }
        });
        return response.text || `${winner} defeated ${loser}!`;
    } catch (e) { return `${winner} defeated ${loser}!`; }
};

// --- V4: SINGULARITY UTILS ---
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
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                targetName: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                rewards: { type: Type.STRING },
                goal: { type: Type.INTEGER }
            }
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
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, lore: { type: Type.STRING } }
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: `Generate rare artifact item name and lore.` }] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

/**
 * ANIME CONSTRUCTOR ENGINE - NO MORE FLAT VOXELS
 */
export const getGenericVoxel = (element: string, bodyType: string, stage: string, visualTraits: any, name: string): string => {
    
    // Fallback data if anatomy is missing (for legacy saves)
    const anatomy = (visualTraits as any)?.anatomy || {
        headShape: 'ROUND',
        bodyShape: bodyType === 'QUADRUPED' ? 'QUAD_BEAST' : 'CHIBI_ROUND',
        eyeStyle: 'ANIME_LARGE',
        primaryColor: visualTraits?.extractedColors?.primary || '#F472B6',
        secondaryColor: visualTraits?.extractedColors?.secondary || '#FFFFFF',
        accentColor: visualTraits?.extractedColors?.accent || '#333333',
        hasWings: false,
        hasTail: true,
        hasHorns: false
    };

    let scale = 1.0;
    if (stage === 'Pro') scale = 1.3;
    if (stage === 'Elite') scale = 1.6;
    if (stage === 'Legend') scale = 2.0;
    if (stage === 'God') scale = 2.5;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; } canvas { display: block; outline: none; }</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let MODE = 'HABITAT'; 
let EDITOR_ACTIVE = false;
let SELECTED_PART_ID = null;
const DATA = ${JSON.stringify(anatomy)};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 300);
camera.position.set(0, 3, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 4; controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI / 2 - 0.05; 
controls.target.set(0, 1.5, 0);

// --- LIGHTING (ANIME STUDIO STYLE) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
scene.add(ambientLight);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2); 
mainLight.position.set(5, 10, 8); mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048,2048);
scene.add(mainLight);
const rimLight = new THREE.SpotLight(parseInt(DATA.primaryColor.replace('#','0x')), 5);
rimLight.position.set(-5, 5, -5);
scene.add(rimLight);

// --- MATERIALS (TOON SHADER) ---
const toonMat = (color) => new THREE.MeshToonMaterial({ 
    color: color, 
    gradientMap: null // default smooth
});
const glowMat = (color) => new THREE.MeshBasicMaterial({ color: color });

const matPrimary = toonMat(DATA.primaryColor);
const matSecondary = toonMat(DATA.secondaryColor);
const matAccent = toonMat(DATA.accentColor);
const matBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });
const matEye = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

// --- CONSTRUCTOR ENGINE ---
const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

const bodyGroup = new THREE.Group();
const partsGroup = new THREE.Group();
charGroup.add(bodyGroup);
charGroup.add(partsGroup);

const collisionMeshes = []; // For attaching parts

function buildAnimeCharacter() {
    // 1. BODY
    let bodyMesh;
    if (DATA.bodyShape === 'CHIBI_ROUND' || DATA.bodyShape === 'FLOATING_ORB') {
        bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), matPrimary);
        bodyMesh.position.y = 1.0;
        bodyMesh.scale.set(1, 0.9, 1);
    } else if (DATA.bodyShape === 'QUAD_BEAST') {
        bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.5, 4, 16), matPrimary);
        bodyMesh.rotation.z = Math.PI / 2;
        bodyMesh.position.y = 1.0;
    } else if (DATA.bodyShape === 'TALL_HUMANOID') {
        bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.2, 4, 16), matPrimary);
        bodyMesh.position.y = 1.5;
    } else if (DATA.bodyShape === 'SERPENT_LORD') {
        bodyMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16), matPrimary);
        bodyMesh.position.y = 1.5;
        bodyMesh.scale.set(1, 0.5, 1);
    } else { // Default
        bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.0, 4, 16), matPrimary);
        bodyMesh.position.y = 1.2;
    }
    bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
    bodyGroup.add(bodyMesh);
    collisionMeshes.push(bodyMesh);

    // 2. HEAD
    let headMesh;
    const headGroup = new THREE.Group();
    if (DATA.headShape === 'ROUND' || DATA.headShape === 'CAT' || DATA.headShape === 'FOX') {
        headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 32), matPrimary);
    } else if (DATA.headShape === 'SQUARE' || DATA.headShape === 'MECH') {
        headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), matPrimary);
    } else if (DATA.headShape === 'DRAGON') {
        headMesh = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2, 32), matPrimary);
        headMesh.rotation.x = -Math.PI/2;
    } else {
         headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), matPrimary);
    }
    
    // Position Head relative to Body
    if(DATA.bodyShape === 'QUAD_BEAST') headGroup.position.set(1.2, 1.5, 0);
    else if (DATA.bodyShape === 'TALL_HUMANOID') headGroup.position.set(0, 2.8, 0);
    else headGroup.position.set(0, 1.8, 0); // Chibi Standard

    headMesh.castShadow = true; headMesh.receiveShadow = true;
    headGroup.add(headMesh);
    collisionMeshes.push(headMesh);
    bodyGroup.add(headGroup);

    // 3. EYES (Anime Style)
    const eyeGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, matEye);
    const rightEye = new THREE.Mesh(eyeGeo, matEye);
    
    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const lp = new THREE.Mesh(pupilGeo, matBlack);
    const rp = new THREE.Mesh(pupilGeo, matBlack);
    lp.position.z = 0.2; rp.position.z = 0.2;
    leftEye.add(lp); rightEye.add(rp);

    if (DATA.eyeStyle === 'CYCLOPS') {
        leftEye.scale.set(2,2,2); leftEye.position.set(0, 0, 0.8);
        headGroup.add(leftEye);
    } else if (DATA.eyeStyle === 'VISOR') {
        const visor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.5), matAccent);
        visor.position.set(0, 0, 0.8);
        headGroup.add(visor);
    } else {
        leftEye.position.set(-0.35, 0.1, 0.75);
        rightEye.position.set(0.35, 0.1, 0.75);
        if(DATA.headShape === 'DRAGON') {
            leftEye.position.set(-0.3, 0.3, 0.5); rightEye.position.set(0.3, 0.3, 0.5);
        }
        headGroup.add(leftEye); headGroup.add(rightEye);
    }

    // 4. FEATURES (Ears, Horns)
    if (DATA.headShape === 'CAT' || DATA.headShape === 'FOX') {
        const earGeo = new THREE.ConeGeometry(0.3, 0.6, 16);
        const lEar = new THREE.Mesh(earGeo, matSecondary);
        const rEar = new THREE.Mesh(earGeo, matSecondary);
        lEar.position.set(-0.6, 0.7, 0); lEar.rotation.z = 0.5;
        rEar.position.set(0.6, 0.7, 0); rEar.rotation.z = -0.5;
        headGroup.add(lEar); headGroup.add(rEar);
    }
    if (DATA.hasHorns) {
        const hornGeo = new THREE.ConeGeometry(0.15, 0.8, 16);
        const lHorn = new THREE.Mesh(hornGeo, matAccent); lHorn.position.set(-0.4, 0.8, -0.2);
        const rHorn = new THREE.Mesh(hornGeo, matAccent); rHorn.position.set(0.4, 0.8, -0.2);
        headGroup.add(lHorn); headGroup.add(rHorn);
    }

    // 5. LIMBS
    const limbGeo = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8);
    if (DATA.bodyShape !== 'FLOATING_ORB' && DATA.bodyShape !== 'SERPENT_LORD') {
        const lArm = new THREE.Mesh(limbGeo, matSecondary); lArm.position.set(-0.9, 1.2, 0); lArm.rotation.z = 0.5;
        const rArm = new THREE.Mesh(limbGeo, matSecondary); rArm.position.set(0.9, 1.2, 0); rArm.rotation.z = -0.5;
        bodyGroup.add(lArm); bodyGroup.add(rArm);

        const legGeo = new THREE.CapsuleGeometry(0.25, 0.7, 4, 8);
        if (DATA.bodyShape === 'QUAD_BEAST') {
            const fl = new THREE.Mesh(legGeo, matSecondary); fl.position.set(-0.6, 0.4, 0.8);
            const fr = new THREE.Mesh(legGeo, matSecondary); fr.position.set(0.6, 0.4, 0.8);
            const bl = new THREE.Mesh(legGeo, matSecondary); bl.position.set(-0.6, 0.4, -0.8);
            const br = new THREE.Mesh(legGeo, matSecondary); br.position.set(0.6, 0.4, -0.8);
            bodyGroup.add(fl); bodyGroup.add(fr); bodyGroup.add(bl); bodyGroup.add(br);
        } else {
            const lLeg = new THREE.Mesh(legGeo, matSecondary); lLeg.position.set(-0.4, 0.4, 0);
            const rLeg = new THREE.Mesh(legGeo, matSecondary); rLeg.position.set(0.4, 0.4, 0);
            bodyGroup.add(lLeg); bodyGroup.add(rLeg);
        }
    }

    // 6. EXTRAS (Wings, Tail)
    if (DATA.hasWings) {
        const wingGeo = new THREE.BoxGeometry(0.1, 1.5, 0.8);
        const lWing = new THREE.Mesh(wingGeo, matAccent); lWing.position.set(-0.8, 1.5, -0.5); lWing.rotation.z = 0.5; lWing.rotation.y = -0.5;
        const rWing = new THREE.Mesh(wingGeo, matAccent); rWing.position.set(0.8, 1.5, -0.5); rWing.rotation.z = -0.5; rWing.rotation.y = 0.5;
        bodyGroup.add(lWing); bodyGroup.add(rWing);
    }
    if (DATA.hasTail) {
        const tailGeo = new THREE.ConeGeometry(0.2, 1.5, 16);
        const tail = new THREE.Mesh(tailGeo, matSecondary);
        tail.position.set(0, 0.6, -1.0); tail.rotation.x = -2;
        bodyGroup.add(tail);
    }
}
buildAnimeCharacter();

// --- ENVIRONMENT ---
const envGroup = new THREE.Group();
scene.add(envGroup);
const ground = new THREE.Mesh(new THREE.CylinderGeometry(50,50,1,64), new THREE.MeshStandardMaterial({ color: 0x222222 }));
ground.position.y = -0.5; ground.receiveShadow = true;
envGroup.add(ground);

// --- ANIMATION ---
const clock = new THREE.Clock();
let currentAction = 'IDLE';

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    controls.update();

    if(currentAction === 'WALK') {
        bodyGroup.position.y = Math.sin(t * 10) * 0.1;
        bodyGroup.rotation.z = Math.sin(t * 5) * 0.05;
    } else if (currentAction === 'ATTACK') {
        bodyGroup.position.z = Math.sin(t * 20) * 0.5;
    } else {
        bodyGroup.position.y = Math.sin(t * 2) * 0.05; // Idle breath
    }
    
    if (DATA.bodyShape === 'FLOATING_ORB') bodyGroup.position.y += 0.5 + Math.sin(t * 3) * 0.2;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// --- PART SYSTEM ---
function createPartGeometry(type) {
    const g = new THREE.Group();
    const addMesh = (geo, mat, pos={x:0,y:0,z:0}, rot={x:0,y:0,z:0}) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(pos.x,pos.y,pos.z); m.rotation.set(rot.x,rot.y,rot.z); m.castShadow=true; g.add(m); return m;
    };
    // Re-implement simplified parts for Anime Style
    if(type.includes('WING')) addMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), matGold, {x:0,y:0.5,z:0}, {x:0,y:0,z:-Math.PI/4});
    else if(type.includes('KATANA')) addMesh(new THREE.BoxGeometry(0.05, 1.2, 0.02), matAccent, {x:0,y:0.6,z:0});
    else addMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matAccent);
    return g;
}

window.addEventListener('message', (e) => {
    const d = e.data;
    if(d.type === 'SET_ACTION') currentAction = d.value;
    if(d.type === 'SET_EQUIPMENT' && d.value?.parts) {
        while(partsGroup.children.length > 0) partsGroup.remove(partsGroup.children[0]);
        d.value.parts.forEach(p => {
             const m = createPartGeometry(p.partType);
             m.position.copy(p.position); m.lookAt(new THREE.Vector3().copy(p.position).add(p.faceNormal));
             partsGroup.add(m);
        });
    }
    // Raycaster for Parts
    if(d.type === 'SET_MODE' && d.value === 'ENGINEER') { EDITOR_ACTIVE = true; SELECTED_PART_ID = d.partId; } 
    else EDITOR_ACTIVE = false;
});

// Simple Engineer Raycast (Simplified for Capsule geometry)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('pointerdown', (e) => {
    if(!EDITOR_ACTIVE) return;
    mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(collisionMeshes, true);
    if(intersects.length > 0) {
        const hit = intersects[0];
        window.parent.postMessage({ type: 'PART_PLACED', partId: SELECTED_PART_ID, position: hit.point, normal: hit.face.normal }, '*');
    }
});

</script>
</body>
</html>`;
}
