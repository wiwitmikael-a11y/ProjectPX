
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText, makeBackgroundTransparent, hideBodyText, zoomCamera } from "../utils/html";
import { BodyType, AITactic, determineEvolutionPath, MonsterStage, getProceduralMonsterArt, MonsterStats } from "./gameData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

const parseGeminiJson = (text: string) => {
    if (!text) return {};
    try {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (e2) {}
        }
        return {};
    }
};

// --- AAA VOXEL ENGINE: NEO-POP CANDY AESTHETIC ---
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob'): string => {
    // STRICT NEO-POP PALETTE (Must match gameData.ts)
    const colors: Record<string, number> = {
        Fire: 0xFF6B6B, Water: 0x4D96FF, Grass: 0x6BCB77, Electric: 0xFFD93D,
        Psychic: 0xC77DFF, Metal: 0x94A3B8, Dark: 0x6D28D9, Light: 0xFFF176,
        Spirit: 0x8A2BE2, Toxic: 0xBEF264
    };
    const secColors: Record<string, number> = {
        Fire: 0xFF9EAA, Water: 0x83C5BE, Grass: 0x34D399, Electric: 0xFFF59D,
        Psychic: 0xE0AAFF, Metal: 0xCBD5E1, Dark: 0x8B5CF6, Light: 0xFFFFFF,
        Spirit: 0xA78BFA, Toxic: 0xE9F5DB
    };

    const primC = colors[element] || 0xCBD5E1;
    const secC = secColors[element] || 0xF1F5F9;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent !important; }
    canvas { display: block; width: 100% !important; height: 100% !important; outline: none; position: absolute; top: 0; left: 0; z-index: 1; }
</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// --- SETUP ---
const scene = new THREE.Scene();
// INITIAL BG: Matches 'Grass' fog as default to avoid white flash
scene.background = new THREE.Color(0xD1FAE5); 
scene.fog = new THREE.FogExp2(0xD1FAE5, 0.025); // Dense fog for infinite look

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(14, 8, 14);

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for toy look
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false; 
controls.autoRotate = true; 
controls.autoRotateSpeed = 1.0;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2 - 0.05; 
controls.target.set(0, 2, 0);
controls.enableDamping = true;

// --- LIGHTING (VINYL TOY STYLE) ---
// High ambient for bright colors, soft directional for depth
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// --- WORLD GROUPS ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);
const habitatGroup = new THREE.Group();
worldGroup.add(habitatGroup);
const charGroup = new THREE.Group();
worldGroup.add(charGroup);

// --- MATERIALS ---
// Cartoon Shader Logic via ToonMaterial + Thick Outline
const primMat = new THREE.MeshToonMaterial({ color: ${primC} });
const secMat = new THREE.MeshToonMaterial({ color: ${secC} });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
const OUTLINE_THICKNESS = 1.025; 

function addOutline(mesh) {
    const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
    outlineMesh.position.copy(mesh.position);
    outlineMesh.rotation.copy(mesh.rotation);
    outlineMesh.scale.copy(mesh.scale).multiplyScalar(OUTLINE_THICKNESS);
    outlineMesh.position.set(0,0,0);
    outlineMesh.rotation.set(0,0,0);
    mesh.add(outlineMesh);
}

function createMesh(geo, mat, parent, pos) {
    const m = new THREE.Mesh(geo, mat);
    if(pos) m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    if(parent) parent.add(m);
    if (mat) addOutline(m);
    return m;
}

// --- DYNAMIC HABITAT SYSTEM (INFINITE HORIZON) ---

// 1. Terrain Mesh (Massive plane to merge with fog)
const groundGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
const groundMat = new THREE.MeshToonMaterial({ color: 0x6BCB77 }); // Default Grass
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
habitatGroup.add(ground);

// 2. Props System (InstancedMesh pools)
const PROP_COUNT = 40;
const dummy = new THREE.Object3D();

// -- Geometries (Rounded for Toy Look) --
const treeGeo = new THREE.ConeGeometry(1, 3, 5); 
const rockGeo = new THREE.DodecahedronGeometry(1); 
const pillarGeo = new RoundedBoxGeometry(0.5, 4, 0.5, 2, 0.1); 
const bubbleGeo = new THREE.IcosahedronGeometry(0.8); 

// -- Prop Groups --
const treeProps = new THREE.InstancedMesh(treeGeo, new THREE.MeshToonMaterial({color: 0x34D399}), PROP_COUNT);
const rockProps = new THREE.InstancedMesh(rockGeo, new THREE.MeshToonMaterial({color: 0xFCA5A5}), PROP_COUNT);
const cityProps = new THREE.InstancedMesh(pillarGeo, new THREE.MeshToonMaterial({color: 0x67E8F9, emissive: 0x22D3EE}), PROP_COUNT);
const waterProps = new THREE.InstancedMesh(bubbleGeo, new THREE.MeshToonMaterial({color: 0x93C5FD, transparent: true, opacity: 0.8}), PROP_COUNT);

[treeProps, rockProps, cityProps, waterProps].forEach(m => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false; 
    habitatGroup.add(m);
});

// -- Particle System --
const partGeo = new THREE.BufferGeometry();
const partCount = 100;
const partPos = new Float32Array(partCount * 3);
for(let i=0; i<partCount*3; i++) partPos[i] = (Math.random()-0.5) * 40;
partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
const partMat = new THREE.PointsMaterial({ size: 0.5, color: 0xffffff, transparent: true, opacity: 0.8 });
const particles = new THREE.Points(partGeo, partMat);
habitatGroup.add(particles);

// --- THEME CONFIG (CANDY COLORED & INFINITE) ---
// Colors must match ELEMENT_THEMES in gameData.ts
const THEMES = {
    'Grass': { 
        groundColor: 0x6BCB77, fog: 0xD1FAE5, prop: treeProps, propColor: 0x10B981, 
        particleColor: 0xA7F3D0, partSpeedY: -0.05, groundRough: true 
    },
    'Water': { 
        groundColor: 0x4D96FF, fog: 0xE0F2FE, prop: waterProps, propColor: 0xBAE6FD, 
        particleColor: 0xFFFFFF, partSpeedY: 0.05, groundRough: true 
    },
    'Fire': { 
        groundColor: 0xFF6B6B, fog: 0xFFE4E6, prop: rockProps, propColor: 0xFF9EAA, 
        particleColor: 0xFDBA74, partSpeedY: 0.08, groundRough: true 
    },
    'Metal': { 
        groundColor: 0x94A3B8, fog: 0xF8FAFC, prop: cityProps, propColor: 0xCBD5E1, 
        particleColor: 0x38BDF8, partSpeedY: 0.02, groundRough: false 
    },
    'Electric': { 
        groundColor: 0xFFD93D, fog: 0xFFFBEB, prop: cityProps, propColor: 0xFDE047, 
        particleColor: 0xFFFF00, partSpeedY: 0.1, groundRough: false 
    },
    'Psychic': { 
        groundColor: 0xC77DFF, fog: 0xF3E8FF, prop: rockProps, propColor: 0xE9D5FF, 
        particleColor: 0xD8B4FE, partSpeedY: 0.02, groundRough: true 
    },
    'Dark': { 
        groundColor: 0x6D28D9, fog: 0xE0E7FF, prop: rockProps, propColor: 0x8B5CF6, 
        particleColor: 0x818CF8, partSpeedY: 0.01, groundRough: true 
    },
    'Toxic': { 
        groundColor: 0xBEF264, fog: 0xECFCCB, prop: waterProps, propColor: 0xD9F99D, 
        particleColor: 0x84CC16, partSpeedY: 0.02, groundRough: true 
    }
};

let currentTheme = null;

function updateHabitat(themeName) {
    const t = THEMES[themeName] || THEMES['Grass'];
    
    // 1. Seamless Fog & Background
    scene.background = new THREE.Color(t.fog);
    scene.fog.color.setHex(t.fog);
    
    // 2. Ground (Infinite Illusion)
    groundMat.color.setHex(t.groundColor);
    
    // Modify Terrain Height for rough ground
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        let z = 0;
        if (t.groundRough) {
            const freq = themeName === 'Water' ? 0.2 : 0.05;
            const amp = themeName === 'Water' ? 2.0 : 3.0;
            z = Math.sin(x * freq) * Math.cos(y * freq) * amp; 
            
            // Flatten center for pet
            if (Math.abs(x) < 6 && Math.abs(y) < 6) z *= 0.1;
        }
        posAttr.setZ(i, z); 
    }
    posAttr.needsUpdate = true;
    groundGeo.computeVertexNormals();

    // 3. Props
    [treeProps, rockProps, cityProps, waterProps].forEach(m => m.visible = false);
    t.prop.visible = true;
    t.prop.material.color.setHex(t.propColor);
    
    // Redistribute props
    for(let i=0; i<PROP_COUNT; i++) {
        const r = 10 + Math.random() * 40; // Spread further out
        const theta = Math.random() * Math.PI * 2;
        dummy.position.set(r * Math.cos(theta), 0, r * Math.sin(theta));
        
        // Match height roughly
        if (t.groundRough) dummy.position.y = (Math.random() - 0.5) * 4;
        else dummy.position.y = 0;

        const s = 0.8 + Math.random();
        dummy.scale.set(s,s,s);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        
        if (themeName === 'City') dummy.scale.y *= 2;
        
        dummy.updateMatrix();
        t.prop.setMatrixAt(i, dummy.matrix);
    }
    t.prop.instanceMatrix.needsUpdate = true;

    // 4. Particles
    partMat.color.setHex(t.particleColor);
    currentTheme = t;
}

// --- CREATURE BUILDER (AAA RIGGING) ---
const bodyType = "${bodyType}";
const stage = "${stage}";
let sScale = stage === 'Pro' ? 1.2 : stage === 'Elite' ? 1.5 : stage === 'Legend' ? 2.0 : 1.0;
const rig = { parts: [] };

function buildCreature() {
    // Use Rounded Geometry for Toy Look
    const boxGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.2);
    const sphereGeo = new THREE.IcosahedronGeometry(1, 2);
    
    let torsoGeo = stage === 'Noob' ? sphereGeo : boxGeo;
    const torsoY = bodyType === 'QUADRUPED' ? 1.5*sScale : 3.0*sScale;
    const torso = createMesh(torsoGeo, primMat, charGroup, [0, torsoY, 0]);
    torso.scale.set(2*sScale, 1.8*sScale, 1.5*sScale);
    rig.parts.push({ m: torso, type: 'body' });

    const headY = 1.2;
    const head = createMesh(sphereGeo, primMat, torso, [0, headY, 0]);
    head.scale.set(0.7, 0.7, 0.7);

    const eyeGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
    const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(0.3, 0.1, 0.85); eL.rotation.y = -0.2; head.add(eL);
    const eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(-0.3, 0.1, 0.85); eR.rotation.y = 0.2; head.add(eR);

    const limbGeo = new RoundedBoxGeometry(0.4, 1.5, 0.4, 2, 0.1);
    
    if (bodyType === 'BIPED') {
        const armL = createMesh(limbGeo, secMat, torso, [0.6, 0, 0]);
        const armR = createMesh(limbGeo, secMat, torso, [-0.6, 0, 0]);
        rig.parts.push({ m: armL, type: 'arm', off: 0 });
        rig.parts.push({ m: armR, type: 'arm', off: Math.PI });

        const legL = createMesh(limbGeo, secMat, charGroup, [0.8*sScale, 0.8*sScale, 0]);
        const legR = createMesh(limbGeo, secMat, charGroup, [-0.8*sScale, 0.8*sScale, 0]);
        rig.parts.push({ m: legL, type: 'leg', off: 0 });
        rig.parts.push({ m: legR, type: 'leg', off: Math.PI });
    } 
    else if (bodyType === 'QUADRUPED') {
        [[0.6,-0.5,0.8], [-0.6,-0.5,0.8], [0.6,-0.5,-0.8], [-0.6,-0.5,-0.8]].forEach((pos, i) => {
            const l = createMesh(limbGeo, secMat, torso, pos);
            rig.parts.push({ m: l, type: 'leg', off: i%2===0?0:Math.PI, spd: 2 });
        });
    }
    else if (bodyType === 'FLOATING') {
        const wingGeo = new RoundedBoxGeometry(0.2, 1.5, 1.5, 2, 0.1);
        const wL = createMesh(wingGeo, secMat, torso, [1.1, 0, 0]);
        const wR = createMesh(wingGeo, secMat, torso, [-1.1, 0, 0]);
        rig.parts.push({ m: wL, type: 'wing' });
        rig.parts.push({ m: wR, type: 'wing' });
    }
}

buildCreature();

// --- ANIMATION LOOP ---
let time = 0;
let isPaused = false;

function animate() {
    if (!isPaused) {
        requestAnimationFrame(animate);
        time += 0.05;
        controls.update();
        
        // 1. Creature Animation
        rig.parts.forEach(p => {
            if (p.type === 'body' && bodyType === 'FLOATING') p.m.position.y += Math.sin(time*2) * 0.02;
            if (p.type === 'arm') p.m.rotation.x = Math.sin(time + p.off) * 0.5;
            if (p.type === 'leg') p.m.rotation.x = Math.sin(time + p.off) * 0.8;
            if (p.type === 'wing') p.m.rotation.z = Math.sin(time*10) * 0.2;
        });
        
        // 2. Particle Animation
        if (currentTheme) {
            const positions = particles.geometry.attributes.position.array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] += currentTheme.partSpeedY; // Move Y
                // Reset if out of bounds
                if (positions[i] > 15) positions[i] = -5;
                if (positions[i] < -5) positions[i] = 15;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        }
        
        renderer.render(scene, camera);
    }
}
animate();

// --- EVENTS ---
window.addEventListener('message', (e) => {
    if (e.data.type === 'PAUSE') {
        isPaused = e.data.value;
        if(!isPaused) animate();
    }
    if (e.data.type === 'SET_MODE') {
        if (e.data.value === 'BATTLE') {
            habitatGroup.visible = false;
            camera.position.set(8, 5, 8);
            camera.lookAt(0, 2, 0);
        } else {
            habitatGroup.visible = true;
            camera.position.set(14, 8, 14);
        }
    }
    if (e.data.type === 'SET_THEME') {
        updateHabitat(e.data.value);
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
</script>
</body>
</html>`;
};

export const analyzeObject = async (imageBase64: string): Promise<MonsterStats> => {
    try {
    if (!imageBase64) throw new Error("Image data is missing");
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeMatch = imageBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analyze this object for a "Monster Tamer" game.
            OUTPUT RULES:
            1. Name: Creative, cool, NO Brand Names.
            2. Element: Infer from color/material.
            3. BodyType: BIPED (Human-like), QUADRUPED (Animal-like), FLOATING (Round/Flying), WHEELED (Car/Toy).
            Return valid JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            element: { type: Type.STRING, enum: ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Metal', 'Dark', 'Light', 'Spirit', 'Toxic'] },
            visual_design: { type: Type.STRING },
            bodyType: { type: Type.STRING, enum: ['BIPED', 'QUADRUPED', 'FLOATING', 'WHEELED', 'SERPENTINE'] },
            hp: { type: Type.INTEGER },
            atk: { type: Type.INTEGER },
            def: { type: Type.INTEGER },
            spd: { type: Type.INTEGER },
            description: { type: Type.STRING }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text || "{}");
    return {
      ...data, 
      id: generateId(),
      dateCreated: Date.now(),
      stage: 'Noob', 
      rarity: 'Common',
      rank: 'E',
      nature: 'Loyal',
      potential: 3,
      int: 10,
      ability: 'Basic',
      moves: [],
      tactic: 'BALANCED',
      happiness: 50
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateCardArt = async (monsterDescription: string, objectName: string, visualDesign: string): Promise<string> => {
    return getProceduralMonsterArt(objectName, "Psychic");
};

export const generateVoxelScene = async (imageBase64: string, visualDescription: string, bodyType: string = 'BIPED'): Promise<string> => {
    // Ensure no post-processing breaks the code
    const code = getGenericVoxel('Metal', bodyType, 'Noob');
    return code;
};

export const fuseVoxelScene = async (petA: MonsterStats, petB: MonsterStats) => {
    const visual_design = `A fusion of ${petA.name} and ${petB.name}.`;
    const code = getGenericVoxel(petA.element, petA.bodyType, 'Pro');
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
    let nextStage: MonsterStage = 'Pro';
    if (pet.stage === 'Noob') nextStage = 'Pro';
    else if (pet.stage === 'Pro') nextStage = 'Elite';
    else if (pet.stage === 'Elite') nextStage = 'Legend';

    const code = getGenericVoxel(pet.element, pet.bodyType, nextStage);
    const { protocolName } = determineEvolutionPath({ 
        atk: pet.atk, def: pet.def, spd: pet.spd, happiness: pet.happiness || 50 
    });

    return { 
        code, 
        visual_design: `Evolved ${nextStage} form.`, 
        nextStage,
        nextName: nextStage === 'Legend' ? `Mega ${pet.name}` : pet.name,
        protocolName
    };
}
