/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { VisualTraits, MonsterStage } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image using the most advanced Gemini model
 * to extract deep "Visual DNA" for AAA character generation.
 */
export const analyzeObject = async (imageBase64: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
                    {
                        text: `Analyze this image for a 3D Monster Generator. 
                        
                        CRITICAL:
                        1. SHAPE: Is the body Round (Sphere), Slender (Cylinder), or Chunky (Cube)?
                        2. FACE: Does it have a snout? Big eyes? ears?
                        3. COLORS: Extract 3 distinct hex codes.
                        
                        Return JSON only:
                        {
                            "name": "Creative Name",
                            "element": "Fire|Water|Grass|Electric|Psychic|Metal|Dark|Light|Spirit|Toxic",
                            "hp": 100, "atk": 20, "def": 20, "spd": 20,
                            "description": "Short lore.",
                            "bodyType": "BIPED|QUADRUPED|FLOATING",
                            "visual_design": "Description",
                            "visualTraits": {
                                "hasHorns": boolean,
                                "hornStyle": "Uni|Dual|Antenna|None",
                                "hasWings": boolean,
                                "wingStyle": "Feather|Bat|Mech|None",
                                "accessory": "Goggles|Scarf|Helmet|Backpack|None",
                                "build": "Chunky|Slender|Round",
                                "hasEars": boolean,
                                "earType": "Pointy|Round|Floppy",
                                "hasSnout": boolean,
                                "surfaceFinish": "Matte|Glossy|Metallic|Emissive",
                                "materialType": "Standard|Magma|Jelly|Moss",
                                "tailStyle": "Segmented|Smooth|None",
                                "specialFeature": "ThrusterFlames|GlowingEyes|None",
                                "extractedColors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }
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
 * Voxel Engine V3.0
 * Features: Anime Eyes, Fluid Tail Physics, Dynamic Particles, Weighted Animation
 */
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob', visualTraits?: VisualTraits, name?: string): string => {
    
    const dna = visualTraits || { 
        hasHorns: false, hasWings: false, 
        build: 'Chunky', accessory: 'None', hasEars: true, 
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

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(6, 3, 10); 

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: "high-performance"});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 20;
controls.target.set(0, 1, 0);

// --- LIGHTING (ANIME STUDIO) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 10, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048; 
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight.position.set(-5, 4, -5); 
scene.add(rimLight);

// --- MATERIALS ---
const mats = {
    prim: new THREE.MeshStandardMaterial({ color: ${pCol}, roughness: 0.6, metalness: 0.1 }),
    sec: new THREE.MeshStandardMaterial({ color: ${sCol}, roughness: 0.6, metalness: 0.1 }),
    acc: new THREE.MeshStandardMaterial({ color: ${aCol}, roughness: 0.4, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
    emissive: new THREE.MeshStandardMaterial({ color: ${aCol}, emissive: ${aCol}, emissiveIntensity: 2.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x88CCFF, transmission: 0.6, roughness: 0.1, thickness: 0.5, transparent: true }),
    outline: new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
};

function createMesh(geo, mat, parent, x=0, y=0, z=0, rotX=0, rotY=0, rotZ=0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, rotZ);
    m.castShadow = true;
    m.receiveShadow = true;
    if(parent) parent.add(m);
    
    // Anime Outline
    const outline = new THREE.Mesh(geo, mats.outline);
    outline.scale.setScalar(1.03);
    m.add(outline);
    
    return m;
}

// --- PARTICLE SYSTEM (Speed Effect) ---
const particleCount = 100;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pSpd = [];

for(let i=0; i<particleCount; i++) {
    pPos[i*3] = (Math.random()-0.5) * 15; // X
    pPos[i*3+1] = Math.random() * 8;      // Y
    pPos[i*3+2] = (Math.random()-0.5) * 20 - 10; // Z
    pSpd.push(Math.random() * 0.2 + 0.1);
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.08, transparent: true, opacity: 0.4});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// --- CHARACTER BUILDER ---
const charGroup = new THREE.Group();
scene.add(charGroup);
charGroup.scale.setScalar(${scale});

const anims = { legs: [], arms: [], tail: [], ears: [], wings: [], body: null };

function buildHead(parent, yPos, zPos) {
    const headGroup = new THREE.Group();
    headGroup.position.set(0, yPos, zPos);
    parent.add(headGroup);

    // 1. Skull
    const headSize = '${dna.build}' === 'Chunky' ? 0.9 : 0.7;
    const skullGeo = new RoundedBoxGeometry(headSize, headSize*0.9, headSize*0.9, 4, 0.2);
    const skull = createMesh(skullGeo, mats.prim, headGroup, 0, 0, 0);

    // 2. Face (Snout)
    if ('${dna.hasSnout}' !== 'false') {
        const snoutGeo = new RoundedBoxGeometry(headSize*0.5, headSize*0.4, 0.3, 2, 0.1);
        createMesh(snoutGeo, mats.sec, skull, 0, -0.15, headSize*0.5);
        // Nose
        createMesh(new THREE.SphereGeometry(0.08), mats.dark, skull, 0, -0.05, headSize*0.5 + 0.15);
    }

    // 3. Complex Eyes (Anime Style)
    function addEye(xSide) {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(xSide * (headSize*0.35), 0.05, headSize*0.42);
        skull.add(eyeGroup);

        // White Sclera
        const scleraGeo = new THREE.CapsuleGeometry(0.12, 0.15, 4, 8);
        createMesh(scleraGeo, mats.white, eyeGroup, 0, 0, 0, Math.PI/2, 0, 0);

        // Pupil/Iris
        const irisGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
        createMesh(irisGeo, mats.acc, eyeGroup, 0, 0, 0.1, Math.PI/2, 0, 0);
        
        // Specular Shine (Soul)
        createMesh(new THREE.SphereGeometry(0.04), mats.shine, eyeGroup, 0.05, 0.05, 0.12);
    }
    addEye(1);
    addEye(-1);

    // 4. Ears (Proportional & Anchored)
    if (${dna.hasEars}) {
        const earType = '${dna.earType || "Pointy"}';
        const earH = 0.5;
        const earW = 0.25;
        let earGeo;
        
        if (earType === 'Round') earGeo = new THREE.CylinderGeometry(earW, earW*0.8, 0.1); // Bear style
        else if (earType === 'Floppy') earGeo = new RoundedBoxGeometry(0.2, 0.6, 0.1); // Dog style
        else earGeo = new THREE.ConeGeometry(earW, earH, 4); // Cat/Fox style

        const earL = new THREE.Group(); earL.position.set(headSize*0.4, headSize*0.4, 0);
        const earR = new THREE.Group(); earR.position.set(-headSize*0.4, headSize*0.4, 0);
        skull.add(earL); skull.add(earR);

        const m1 = createMesh(earGeo, mats.prim, earL, 0, earH*0.4, 0);
        const m2 = createMesh(earGeo, mats.prim, earR, 0, earH*0.4, 0);
        
        // Inner Ear Color
        if (earType !== 'Round') {
            const innerGeo = new THREE.ConeGeometry(earW*0.6, earH*0.6, 4);
            createMesh(innerGeo, mats.sec, m1, 0, 0, 0.05);
            createMesh(innerGeo, mats.sec, m2, 0, 0, 0.05);
        }

        // Tilt them
        earL.rotation.z = -0.3; earR.rotation.z = 0.3;
        anims.ears.push(earL, earR);
    }

    // 5. Horns/Antenna
    if (${dna.hasHorns}) {
        const style = '${dna.hornStyle}';
        if (style === 'Antenna') {
             createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), mats.acc, skull, 0, 0.6, 0);
             createMesh(new THREE.SphereGeometry(0.08), mats.emissive, skull, 0, 1.0, 0);
        } else if (style === 'Dual') {
             const hGeo = new THREE.ConeGeometry(0.08, 0.4, 8);
             createMesh(hGeo, mats.dark, skull, 0.25, 0.6, 0, 0, 0, -0.2);
             createMesh(hGeo, mats.dark, skull, -0.25, 0.6, 0, 0, 0, 0.2);
        } else {
             createMesh(new THREE.ConeGeometry(0.1, 0.5, 8), mats.dark, skull, 0, 0.6, 0.1, 0.2, 0, 0);
        }
    }
}

function buildBody() {
    // Main Body
    const bodyW = '${bodyType}' === 'QUADRUPED' ? 0.9 : 0.8;
    const bodyH = '${bodyType}' === 'QUADRUPED' ? 0.8 : 1.0;
    const bodyD = '${bodyType}' === 'QUADRUPED' ? 1.4 : 0.7;
    
    const torsoGeo = new RoundedBoxGeometry(bodyW, bodyH, bodyD, 4, 0.2);
    const torso = createMesh(torsoGeo, mats.prim, charGroup, 0, 1.2, 0);
    anims.body = torso;

    // Belly Patch
    createMesh(new RoundedBoxGeometry(bodyW*0.7, bodyH*0.7, 0.1, 2, 0.05), mats.sec, torso, 0, 0, bodyD*0.5);

    // Head Attachment
    const headY = '${bodyType}' === 'QUADRUPED' ? bodyH*0.3 : bodyH*0.6;
    const headZ = '${bodyType}' === 'QUADRUPED' ? bodyD*0.45 : 0;
    buildHead(torso, headY, headZ);

    // Limbs
    const limbW = 0.25;
    const limbL = 0.7;
    const limbGeo = new RoundedBoxGeometry(limbW, limbL, limbW, 2, 0.05);

    if ('${bodyType}' === 'QUADRUPED') {
        const xOff = bodyW * 0.4;
        const yOff = -bodyH * 0.3;
        const zOff = bodyD * 0.35;
        
        const pos = [
            {x: xOff, z: zOff, p: 0}, {x: -xOff, z: zOff, p: Math.PI}, 
            {x: xOff, z: -zOff, p: Math.PI}, {x: -xOff, z: -zOff, p: 0}
        ];
        
        pos.forEach(cfg => {
            const pivot = new THREE.Group();
            pivot.position.set(cfg.x, yOff, cfg.z);
            torso.add(pivot);
            const leg = createMesh(limbGeo, mats.sec, pivot, 0, -limbL*0.4, 0);
            createMesh(new THREE.BoxGeometry(0.28, 0.15, 0.3), mats.dark, leg, 0, -limbL*0.45, 0.05); // Paw/Hoof
            anims.legs.push({ mesh: pivot, phase: cfg.p });
        });

    } else if ('${bodyType}' === 'FLOATING') {
        // Floating bits
        createMesh(new THREE.ConeGeometry(0.3, 0.8, 8), mats.emissive, torso, 0, -0.8, 0, Math.PI, 0, 0); // Thruster

    } else {
        // BIPED
        // Legs
        const xOff = bodyW * 0.3;
        const yOff = -bodyH * 0.4;
        
        [xOff, -xOff].forEach((x, i) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, yOff, 0);
            torso.add(pivot);
            const leg = createMesh(limbGeo, mats.sec, pivot, 0, -limbL*0.4, 0);
            createMesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), mats.dark, leg, 0, -limbL*0.45, 0.1); // Foot
            anims.legs.push({ mesh: pivot, phase: i === 0 ? 0 : Math.PI });
        });

        // Arms
        const armL = 0.6;
        const armGeo = new RoundedBoxGeometry(0.2, armL, 0.2, 2, 0.05);
        [bodyW*0.55, -bodyW*0.55].forEach((x, i) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, bodyH*0.2, 0);
            torso.add(pivot);
            createMesh(armGeo, mats.prim, pivot, 0, -armL*0.4, 0);
            createMesh(new THREE.SphereGeometry(0.15), mats.sec, pivot, 0, -armL*0.4, 0); // Hand
            anims.arms.push({ mesh: pivot, phase: i === 0 ? Math.PI : 0 });
        });
    }

    // Tail (Sine Wave Chain)
    if ('${dna.tailStyle}' !== 'None') {
        const tailRoot = new THREE.Group();
        tailRoot.position.set(0, -bodyH*0.3, -bodyD*0.45);
        torso.add(tailRoot);
        
        let prevSeg = tailRoot;
        const segCount = 6;
        for(let i=0; i<segCount; i++) {
            const segPivot = new THREE.Group();
            segPivot.position.set(0, 0, i === 0 ? 0 : -0.25);
            prevSeg.add(segPivot);
            
            const sGeo = new THREE.SphereGeometry(0.15 - (i*0.02), 8, 8);
            createMesh(sGeo, mats.prim, segPivot, 0, 0, 0);
            
            anims.tail.push(segPivot);
            prevSeg = segPivot;
        }
    }

    // Wings
    if (${dna.hasWings}) {
        const wingGeo = new RoundedBoxGeometry(0.8, 0.1, 0.4, 2, 0.02);
        const wL = new THREE.Group(); wL.position.set(0.4, 0.2, -0.3);
        const wR = new THREE.Group(); wR.position.set(-0.4, 0.2, -0.3);
        torso.add(wL); torso.add(wR);
        createMesh(wingGeo, mats.acc, wL, 0.4, 0, 0);
        createMesh(wingGeo, mats.acc, wR, -0.4, 0, 0);
        anims.wings.push(wL, wR);
    }
}

buildBody();

// --- GROUND & PROPS ---
const groundGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
const pos = groundGeo.attributes.position;
for(let i=0; i<pos.count; i++) {
    const z = pos.getZ(i);
    // Add noise to terrain
    pos.setZ(i, Math.sin(pos.getX(i)*0.2) * 0.5 + Math.random()*0.1); 
}
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4ADE80, roughness: 1.0 });
const ground = createMesh(groundGeo, groundMat, scene, 0, -0.5, 0);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;

// Scatter Props (Grass/Rocks)
for(let i=0; i<30; i++) {
    const x = (Math.random()-0.5)*40;
    const z = (Math.random()-0.5)*40;
    if(Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Clear center
    
    const s = Math.random()*0.5 + 0.2;
    createMesh(new THREE.ConeGeometry(0.2, 0.5, 4), mats.sec, ground, x, 0, z, Math.PI/2, 0, 0);
}

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
let currentAction = 'WALK';
let isPaused = false;

window.addEventListener('message', (e) => {
    if(e.data.type === 'SET_ACTION') currentAction = e.data.value;
});

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if(!isPaused) {
        // 1. Walk Cycle (Legs)
        const speed = currentAction === 'RUN' ? 18 : 10;
        const amp = currentAction === 'RUN' ? 1.2 : 0.6;
        
        anims.legs.forEach(l => {
            l.mesh.rotation.x = Math.sin(t * speed + l.phase) * amp;
        });
        
        // 2. Arm Swing (Opposite to legs)
        anims.arms.forEach(a => {
            a.mesh.rotation.x = Math.sin(t * speed + a.phase) * (amp * 0.8);
            a.mesh.rotation.z = Math.sin(t * speed) * 0.1; // Slight lateral sway
        });

        // 3. Body Physics (Bob & Sway)
        if(anims.body) {
            const bobFreq = speed * 2; // Bob happens twice per step
            anims.body.position.y = 1.2 + Math.abs(Math.sin(t * speed)) * 0.1; 
            anims.body.rotation.z = Math.sin(t * speed) * 0.05; // Rolling hips
            anims.body.rotation.y = Math.sin(t * speed * 0.5) * 0.05; // Steering sway
        }
        
        // 4. Fluid Tail (Sine Wave Propagation)
        anims.tail.forEach((seg, i) => {
            const offset = i * 0.3;
            // Whip effect: rotation delayed by index
            seg.rotation.y = Math.sin(t * speed * 0.8 - offset) * 0.3; 
            seg.rotation.x = Math.cos(t * speed * 0.8 - offset) * 0.1;
        });

        // 5. Reactive Parts
        anims.ears.forEach((e, i) => {
            e.rotation.z = (i===0 ? -0.3 : 0.3) + Math.sin(t * 10) * 0.05; // Twitch
        });
        
        if(anims.wings.length > 0) {
            const flapSpeed = currentAction === 'RUN' ? 20 : 5;
            anims.wings[0].rotation.z = Math.sin(t * flapSpeed) * 0.5;
            anims.wings[1].rotation.z = -Math.sin(t * flapSpeed) * 0.5;
        }

        // 6. Particle Streaming (Speed Effect)
        // Move particles towards camera (positive Z) to simulate forward motion
        const pPosArr = pGeo.attributes.position.array;
        for(let i=0; i<particleCount; i++) {
            pPosArr[i*3+2] += pSpd[i]; // Move Z
            if(pPosArr[i*3+2] > 10) pPosArr[i*3+2] = -10; // Reset
        }
        pGeo.attributes.position.needsUpdate = true;
    }
    
    renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

</script>
</body>
</html>`;
};

/**
 * Keeps existing evolution logic, but uses updated renderer
 */
export const evolveVoxelScene = async (pet: any): Promise<{nextStage: MonsterStage, nextName: string, code: string}> => {
    const nextStages: Record<string, MonsterStage> = { 'Noob': 'Pro', 'Pro': 'Elite', 'Elite': 'Legend' };
    const nextStage = nextStages[pet.stage] || 'Legend';

    try {
        // Simple mock evolution for stability
        const code = getGenericVoxel(pet.element, pet.bodyType, nextStage, pet.visualTraits, pet.name);
        return { nextStage, nextName: `${pet.name} X`, code };
    } catch (error) {
        return { nextStage, nextName: pet.name, code: pet.voxelCode };
    }
};