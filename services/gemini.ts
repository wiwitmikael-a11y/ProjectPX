
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText } from "../utils/html";
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

// --- ADVANCED VOXEL ENGINE (DIGIMON STYLE) ---
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED', stage: string = 'Noob'): string => {
    // 1. Color Palette Definition
    const colors: Record<string, number> = {
        Fire: 0xff4400, Water: 0x0088ff, Grass: 0x44cc00, Electric: 0xffcc00,
        Psychic: 0xaa00ff, Metal: 0x999999, Dark: 0x220044, Light: 0xffffee,
        Spirit: 0x6600cc, Toxic: 0x88cc00
    };
    const secColors: Record<string, number> = {
        Fire: 0x550000, Water: 0x002266, Grass: 0x115500, Electric: 0x664400,
        Psychic: 0x220044, Metal: 0x444444, Dark: 0x000000, Light: 0xffeecc,
        Spirit: 0x110022, Toxic: 0x224400
    };
    const skyColors: Record<string, number> = {
        Fire: 0x442211, Water: 0x112244, Grass: 0x113311, Electric: 0x333311,
        Psychic: 0x221133, Metal: 0x222222, Dark: 0x111111, Light: 0xccddff,
        Spirit: 0x111122, Toxic: 0x222211
    };

    const primC = colors[element] || 0x888888;
    const secC = secColors[element] || 0x333333;
    const skyC = skyColors[element] || 0x87CEEB;
    const glowC = 0xffffff; 

    return `<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;background:transparent;}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- SETUP ---
const scene = new THREE.Scene();
const FOG_COLOR = ${skyC};
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.02); 
// scene.background = new THREE.Color(FOG_COLOR); // Removed to keep transparent capability, but Fog handles horizon

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(12, 8, 16);

const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false; 
controls.autoRotate = true; 
controls.autoRotateSpeed = 0.8;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.target.set(0, 3, 0);

// --- LIGHTING ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// --- GROUPS ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);
const habitatGroup = new THREE.Group();
worldGroup.add(habitatGroup);
const charGroup = new THREE.Group();
worldGroup.add(charGroup);

// --- MATERIALS ---
const primMat = new THREE.MeshStandardMaterial({color: ${primC}, roughness: 0.4, metalness: 0.2});
const secMat = new THREE.MeshStandardMaterial({color: ${secC}, roughness: 0.7, metalness: 0.1});
const glowMat = new THREE.MeshBasicMaterial({color: ${glowC}});
const eyeMat = new THREE.MeshBasicMaterial({color: 0x00ff00});
const groundMat = new THREE.MeshStandardMaterial({color: 0x333333, roughness: 1});

// --- INFINITE HABITAT GENERATION ---

// 1. Ground Plane (Massive)
const groundGeo = new THREE.PlaneGeometry(400, 400, 64, 64);
// Deform ground with noise for hills, but keep center flat
const pos = groundGeo.attributes.position;
for(let i=0; i<pos.count; i++){
    const x = pos.getX(i);
    const y = pos.getY(i); // Actually Z in plane space
    const dist = Math.sqrt(x*x + y*y);
    let zHeight = 0;
    
    if(dist > 8) {
        zHeight = Math.sin(x*0.1) * Math.cos(y*0.1) * 2 + Math.random() * 0.5;
    }
    pos.setZ(i, zHeight);
}
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
habitatGroup.add(ground);

// 2. Biome Props (Scattered away from center)
const propCount = 40;
const element = "${element}";
for(let i=0; i<propCount; i++) {
    const r = 15 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    const y = 0; // Should sample terrain height ideally, but simple logic ensures they poke up

    if (element === 'Grass') {
        // Trees
        const h = 4 + Math.random() * 6;
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h/2), secMat);
        trunk.position.y = h/4;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, h/1.5, 8), primMat);
        leaves.position.y = h/2 + h/4;
        tree.add(trunk); tree.add(leaves);
        tree.position.set(x, y, z);
        habitatGroup.add(tree);
    } else if (element === 'Fire') {
        // Spikes/Rocks
        const spike = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 4), secMat);
        spike.position.set(x, 2, z);
        spike.rotation.x = (Math.random()-0.5);
        spike.rotation.z = (Math.random()-0.5);
        habitatGroup.add(spike);
    } else if (element === 'Water') {
        // Coral/Crystals
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1 + Math.random()), primMat);
        crystal.position.set(x, 1 + Math.random(), z);
        habitatGroup.add(crystal);
    } else {
        // Generic Cubes
        const cube = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), secMat);
        cube.position.set(x, 1, z);
        habitatGroup.add(cube);
    }
}

// --- COMPLEX CREATURE GENERATOR (SEGMENTED) ---
const bodyType = "${bodyType}";
const stage = "${stage}"; // Noob, Pro, Elite, Legend

// Helpers
function createMesh(geo, mat, parent, pos, rot, scale) {
    const m = new THREE.Mesh(geo, mat);
    if(pos) m.position.set(...pos);
    if(rot) m.rotation.set(...rot);
    if(scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    if(parent) parent.add(m);
    return m;
}

// Animation Rigs
const rig = {
    head: null,
    torso: null,
    arms: { left: null, right: null },
    legs: { left: null, right: null },
    tail: null,
    floaters: []
};

// SCALE FACTORS BASED ON STAGE
let sScale = 1;
if (stage === 'Pro') sScale = 1.2;
if (stage === 'Elite') sScale = 1.5;
if (stage === 'Legend') sScale = 2.0;

// BUILD FUNCTION
function buildCreature() {
    // 1. TORSO (Root of body)
    const torsoGeo = stage === 'Noob' 
        ? new THREE.SphereGeometry(1.5 * sScale, 16, 16) // Round cute body for noobs
        : new THREE.CylinderGeometry(1.5 * sScale, 1.2 * sScale, 3 * sScale, 8); // Robust body for others
    
    rig.torso = createMesh(torsoGeo, primMat, charGroup, [0, bodyType==='QUADRUPED'? 2*sScale : 3*sScale, 0]);
    
    // Armor Plate
    if (stage !== 'Noob') {
        createMesh(new THREE.BoxGeometry(2*sScale, 1.5*sScale, 0.5*sScale), secMat, rig.torso, [0, 0, 1.2*sScale]);
    }

    // 2. HEAD
    const headGeo = stage === 'Noob'
        ? new THREE.BoxGeometry(2.2*sScale, 2.2*sScale, 2.2*sScale) // Big head for noob
        : new THREE.BoxGeometry(1.8*sScale, 2*sScale, 2*sScale);
        
    const headY = stage === 'Noob' ? 1.5*sScale : 2.5*sScale;
    const headZ = bodyType === 'QUADRUPED' ? 1.5*sScale : 0;
    
    rig.head = createMesh(headGeo, primMat, rig.torso, [0, headY, headZ]);
    
    // Face
    createMesh(new THREE.BoxGeometry(0.5*sScale, 0.5*sScale, 0.1), eyeMat, rig.head, [0.5*sScale, 0.2*sScale, 1*sScale]); // Eye R
    createMesh(new THREE.BoxGeometry(0.5*sScale, 0.5*sScale, 0.1), eyeMat, rig.head, [-0.5*sScale, 0.2*sScale, 1*sScale]); // Eye L
    
    // Accessories (Horns/Ears) based on Element
    if (element === 'Fire' || element === 'Dark') {
        createMesh(new THREE.ConeGeometry(0.3*sScale, 1*sScale, 4), secMat, rig.head, [0.8*sScale, 1*sScale, 0], [0,0,-0.5]);
        createMesh(new THREE.ConeGeometry(0.3*sScale, 1*sScale, 4), secMat, rig.head, [-0.8*sScale, 1*sScale, 0], [0,0,0.5]);
    } else if (element === 'Grass' || element === 'Electric') {
        createMesh(new THREE.BoxGeometry(0.2*sScale, 1*sScale, 0.5*sScale), secMat, rig.head, [1*sScale, 0.5*sScale, 0]);
        createMesh(new THREE.BoxGeometry(0.2*sScale, 1*sScale, 0.5*sScale), secMat, rig.head, [-1*sScale, 0.5*sScale, 0]);
    }

    // 3. LIMBS
    if (bodyType === 'BIPED') {
        // Arms
        const armGeo = new THREE.BoxGeometry(0.6*sScale, 2*sScale, 0.6*sScale);
        rig.arms.left = createMesh(armGeo, secMat, rig.torso, [1.8*sScale, 0.5*sScale, 0], [0,0,-0.2]);
        rig.arms.right = createMesh(armGeo, secMat, rig.torso, [-1.8*sScale, 0.5*sScale, 0], [0,0,0.2]);
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.8*sScale, 2.5*sScale, 0.8*sScale);
        rig.legs.left = createMesh(legGeo, secMat, charGroup, [1*sScale, 1.2*sScale, 0]);
        rig.legs.right = createMesh(legGeo, secMat, charGroup, [-1*sScale, 1.2*sScale, 0]);
        
    } else if (bodyType === 'QUADRUPED') {
        rig.torso.rotation.x = Math.PI/2; // Horizontal body
        
        const legGeo = new THREE.CylinderGeometry(0.4*sScale, 0.3*sScale, 2*sScale);
        rig.legs.left = createMesh(legGeo, secMat, charGroup, [1.2*sScale, 1*sScale, 1.5*sScale]); // Front L
        rig.legs.right = createMesh(legGeo, secMat, charGroup, [-1.2*sScale, 1*sScale, 1.5*sScale]); // Front R
        // Back legs reused in anim loop logic differently but stored here
        // Actually let's just add them directly for simplicity in this procedural rig
        createMesh(legGeo, secMat, charGroup, [1.2*sScale, 1*sScale, -1.5*sScale]);
        createMesh(legGeo, secMat, charGroup, [-1.2*sScale, 1*sScale, -1.5*sScale]);
    } else if (bodyType === 'FLOATING') {
        // Rings or Thrusters
        const ring = createMesh(new THREE.TorusGeometry(2.5*sScale, 0.2*sScale, 8, 16), secMat, rig.torso, [0,0,0], [Math.PI/2, 0, 0]);
        rig.floaters.push(ring);
        // No legs
    }

    // 4. WINGS / BACK PROP (Elite/Legend only)
    if (stage === 'Elite' || stage === 'Legend') {
        const wingGeo = new THREE.BoxGeometry(0.2*sScale, 4*sScale, 1.5*sScale);
        const wingL = createMesh(wingGeo, glowMat, rig.torso, [1*sScale, 1*sScale, -1*sScale], [0.5, 0, -0.5]);
        const wingR = createMesh(wingGeo, glowMat, rig.torso, [-1*sScale, 1*sScale, -1*sScale], [0.5, 0, 0.5]);
        rig.floaters.push(wingL, wingR); // Hack to animate them
    }
}

buildCreature();

// --- ANIMATION LOOP ---
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;
  
  controls.update();

  // Floating / Breathing
  const hover = Math.sin(time * 1.5) * 0.2;
  if (bodyType === 'FLOATING') {
      charGroup.position.y = 3 + hover;
      charGroup.rotation.z = Math.sin(time) * 0.1;
      // Spin rings
      rig.floaters.forEach(f => f.rotation.z += 0.1);
  } else {
      // Grounded breathing
      rig.torso.position.y = (bodyType==='QUADRUPED'? 2*sScale : 3*sScale) + hover * 0.5;
  }

  // Walk Cycle
  if (bodyType === 'BIPED') {
      if (rig.legs.left && rig.legs.right) {
          rig.legs.left.rotation.x = Math.sin(time * 2) * 0.5;
          rig.legs.right.rotation.x = Math.sin(time * 2 + Math.PI) * 0.5;
      }
      if (rig.arms.left && rig.arms.right) {
          rig.arms.left.rotation.x = Math.sin(time * 2 + Math.PI) * 0.5;
          rig.arms.right.rotation.x = Math.sin(time * 2) * 0.5;
      }
  }

  // Wing Flap
  if (stage === 'Elite' || stage === 'Legend') {
     // Simple flutter if we added wings to floaters array
  }

  renderer.render(scene, camera);
}
animate();

// --- MESSAGING ---
window.addEventListener('message', (event) => {
    const { type, value } = event.data;
    if (type === 'SET_MODE') {
        if (value === 'BATTLE') {
            habitatGroup.visible = false;
            controls.autoRotate = false;
            camera.position.set(5, 3, 8);
            camera.lookAt(0, 2, 0);
        } else {
            habitatGroup.visible = true;
            controls.autoRotate = true;
            camera.position.set(12, 8, 16);
        }
    }
});

window.onresize = () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
</script></body></html>`;
};

// NOTE: analyzeObject, generateCardArt, generateVoxelScene, etc. remain unchanged but import above used
export const analyzeObject = async (imageBase64: string): Promise<MonsterStats> => {
     try {
    if (!imageBase64) throw new Error("Image data is missing");
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeMatch = imageBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analyze this object and create a game character profile.
            
            **RULES:**
            1. **NAME:** Do not use brand names. Use a cool "Gamer" name based on the object.
            2. **BODY TYPE:** 
               - If it looks like an animal -> QUADRUPED.
               - If it looks like a person/figure -> BIPED.
               - If it's round/object-like -> FLOATING.
               - If it has wheels -> WHEELED.
            
            Return JSON.`
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
            rarity: { type: Type.STRING, enum: ['Common', 'Rare', 'Epic', 'Legendary', 'Glitch'] },
            stage: { type: Type.STRING, enum: ['Noob'] },
            rank: { type: Type.STRING }, 
            nature: { type: Type.STRING },
            visual_design: { type: Type.STRING },
            bodyType: { type: Type.STRING, enum: ['BIPED', 'QUADRUPED', 'FLOATING', 'WHEELED', 'SERPENTINE'] },
            potential: { type: Type.INTEGER },
            hp: { type: Type.INTEGER },
            atk: { type: Type.INTEGER },
            def: { type: Type.INTEGER },
            spd: { type: Type.INTEGER },
            int: { type: Type.INTEGER },
            description: { type: Type.STRING },
            ability: { type: Type.STRING },
            moves: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, power: { type: Type.INTEGER }, accuracy: { type: Type.INTEGER }, description: { type: Type.STRING } } } }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text || "{}");
    return {
      ...data, 
      id: generateId(),
      dateCreated: Date.now(),
      tactic: 'BALANCED',
      stage: 'Noob', 
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
    // Initial generation is always Noob stage
    return getGenericVoxel('Metal', bodyType, 'Noob');
};

export const fuseVoxelScene = async (petA: MonsterStats, petB: MonsterStats) => {
    const visual_design = `A fusion of ${petA.name} and ${petB.name}.`;
    const code = getGenericVoxel(petA.element, petA.bodyType, 'Pro');
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
    // Determine next stage
    let nextStage: MonsterStage = 'Pro';
    if (pet.stage === 'Noob') nextStage = 'Pro';
    else if (pet.stage === 'Pro') nextStage = 'Elite';
    else if (pet.stage === 'Elite') nextStage = 'Legend';

    // Generate new complex model code
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
