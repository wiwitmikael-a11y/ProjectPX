
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

// Improved Generic Voxel builder to handle specific body types and elements
export const getGenericVoxel = (element: string = 'Neutral', bodyType: string = 'BIPED'): string => {
    const colors: Record<string, number> = {
        Fire: 0xff4400, Water: 0x0088ff, Grass: 0x00cc44,
        Electric: 0xffcc00, Psychic: 0xaa00ff, Metal: 0x888888,
        Dark: 0x220044, Light: 0xffffee, Spirit: 0x6600cc, Toxic: 0x88cc00
    };
    const skyColors: Record<string, number> = {
        Fire: 0x551100, Water: 0x001133, Grass: 0x003311,
        Electric: 0x332200, Psychic: 0x220033, Metal: 0x333333,
        Dark: 0x000000, Light: 0xffeecc, Spirit: 0x110022, Toxic: 0x223300
    };

    const c = colors[element] || 0xcccccc;
    const sky = skyColors[element] || 0x87CEEB;
    const acc = 0xffffff; 

    return `<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;background:transparent;}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
// FOG for illusion of depth
scene.fog = new THREE.FogExp2(${sky}, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(15,15,15);

const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 1.0;
controls.minDistance = 8; controls.maxDistance = 40;

// Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(20,50,20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// GROUPS
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const habitatGroup = new THREE.Group();
worldGroup.add(habitatGroup);

const charGroup = new THREE.Group();
worldGroup.add(charGroup);

// Materials
const mainMat = new THREE.MeshStandardMaterial({color: ${c}, roughness: 0.3, metalness: 0.1});
const accMat = new THREE.MeshStandardMaterial({color: ${acc}, roughness: 0.2});
const blackMat = new THREE.MeshBasicMaterial({color:0x111111});
const groundMat = new THREE.MeshStandardMaterial({color: 0x444444, roughness: 1});

// --- HABITAT GENERATION (LIVING WORLD) ---

// 1. Sky Dome (Horizon Illusion)
const hemiLight = new THREE.HemisphereLight(${c}, ${sky}, 0.6);
scene.add(hemiLight);

const skyGeo = new THREE.SphereGeometry(60, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({color: ${sky}, side: THREE.BackSide});
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
habitatGroup.add(skyMesh);

// 2. Dynamic Terrain
const groundGeo = new THREE.CylinderGeometry(25, 20, 4, 16);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -3;
ground.receiveShadow = true;
habitatGroup.add(ground);

// Props
const propCount = 12;
for(let i=0; i<propCount; i++) {
    const angle = (i / propCount) * Math.PI * 2;
    const r = 10 + Math.random() * 10;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    if ('${element}' === 'Grass') {
        const h = 2 + Math.random() * 3;
        const tree = new THREE.Mesh(new THREE.ConeGeometry(1, h, 4), new THREE.MeshStandardMaterial({color:0x00aa00}));
        tree.position.set(x, -1 + h/2, z); 
        tree.castShadow = true;
        habitatGroup.add(tree);
    } else if ('${element}' === 'Fire') {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.random()), new THREE.MeshStandardMaterial({color:0x550000}));
        rock.position.set(x, -0.5, z); 
        habitatGroup.add(rock);
    } else if ('${element}' === 'Water') {
         // Bubbles
         const bub = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({color:0x0088ff, transparent:true, opacity:0.5}));
         bub.position.set(x, Math.random()*5, z);
         habitatGroup.add(bub);
    } else {
        // Generic crystal
        const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({color: ${c}}));
        cry.position.set(x, 0, z);
        habitatGroup.add(cry);
    }
}

// --- ARCADE STYLE BODY GENERATOR ---
const bodyType = "${bodyType}";

// Helper for parts
const createPart = (geo, mat, parent, pos, rot) => {
    const mesh = new THREE.Mesh(geo, mat);
    if(pos) mesh.position.set(pos[0], pos[1], pos[2]);
    if(rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
};

const animParts = { legs: [], arms: [], floaters: [] };

if (bodyType === 'FLOATING') {
    // Core
    const core = createPart(new THREE.IcosahedronGeometry(2.5, 0), mainMat, charGroup, [0,0,0]);
    
    // Rotating Rings
    const ringGeo = new THREE.TorusGeometry(3.5, 0.2, 8, 32);
    const ring = createPart(ringGeo, accMat, charGroup, [0,0,0], [Math.PI/2, 0, 0]);
    animParts.floaters.push(ring);

    // Thruster
    createPart(new THREE.ConeGeometry(1, 2, 8), blackMat, charGroup, [0, -2.5, 0], [Math.PI, 0, 0]);

} else if (bodyType === 'QUADRUPED') {
    // Body
    createPart(new THREE.BoxGeometry(3, 2, 5), mainMat, charGroup, [0,0,0]);
    // Head
    createPart(new THREE.BoxGeometry(2, 2, 2.5), mainMat, charGroup, [0, 1.5, 2.5]);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.5);
    animParts.legs.push(createPart(legGeo, accMat, charGroup, [1.5, -1.5, 2]));
    animParts.legs.push(createPart(legGeo, accMat, charGroup, [-1.5, -1.5, 2]));
    animParts.legs.push(createPart(legGeo, accMat, charGroup, [1.5, -1.5, -2]));
    animParts.legs.push(createPart(legGeo, accMat, charGroup, [-1.5, -1.5, -2]));

    // Tail
    createPart(new THREE.ConeGeometry(0.5, 3, 4), mainMat, charGroup, [0, 0.5, -3], [-Math.PI/2, 0, 0]);

} else {
    // BIPED (Mech Style)
    // Torso
    createPart(new THREE.CylinderGeometry(2, 1.5, 3, 6), mainMat, charGroup, [0, 0, 0]);
    
    // Head
    createPart(new THREE.BoxGeometry(1.8, 1.5, 1.8), mainMat, charGroup, [0, 2.5, 0]);
    
    // Shoulders
    createPart(new THREE.SphereGeometry(1.2), accMat, charGroup, [2.2, 1, 0]);
    createPart(new THREE.SphereGeometry(1.2), accMat, charGroup, [-2.2, 1, 0]);

    // Arms
    animParts.arms.push(createPart(new THREE.BoxGeometry(0.8, 2.5, 0.8), mainMat, charGroup, [2.8, -0.5, 0]));
    animParts.arms.push(createPart(new THREE.BoxGeometry(0.8, 2.5, 0.8), mainMat, charGroup, [-2.8, -0.5, 0]));
    
    // Legs
    animParts.legs.push(createPart(new THREE.BoxGeometry(1, 3, 1), accMat, charGroup, [1, -2.5, 0]));
    animParts.legs.push(createPart(new THREE.BoxGeometry(1, 3, 1), accMat, charGroup, [-1, -2.5, 0]));
}

// Universal Eyes
const eyeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.2);
const eyePos = bodyType === 'QUADRUPED' ? [0.6, 1.8, 3.7] : bodyType === 'FLOATING' ? [0.8, 0.5, 2.2] : [0.5, 2.6, 0.9];
createPart(eyeGeo, new THREE.MeshBasicMaterial({color:0x00ff00}), charGroup, eyePos);
createPart(eyeGeo, new THREE.MeshBasicMaterial({color:0x00ff00}), charGroup, [-eyePos[0], eyePos[1], eyePos[2]]);


// --- ANIMATION LOOP (PHYSICS & MOVEMENT) ---
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.05;
  
  // Camera Follow (Soft Anchor)
  // We keep the camera orbiting, but shift focus if char moves
  controls.target.lerp(charGroup.position, 0.1);
  controls.update();

  // 1. Breathing/Floating
  charGroup.position.y = Math.sin(time * 0.5) * 0.3;
  
  // 2. Specific Animations
  if (bodyType === 'BIPED') {
      // Walking swing
      animParts.legs[0].rotation.x = Math.sin(time) * 0.5;
      animParts.legs[1].rotation.x = Math.sin(time + Math.PI) * 0.5;
      animParts.arms[0].rotation.x = Math.sin(time + Math.PI) * 0.3;
      animParts.arms[1].rotation.x = Math.sin(time) * 0.3;
  } else if (bodyType === 'QUADRUPED') {
      // Trot
      animParts.legs[0].rotation.x = Math.sin(time) * 0.5;
      animParts.legs[1].rotation.x = Math.sin(time + Math.PI) * 0.5;
      animParts.legs[2].rotation.x = Math.sin(time + Math.PI) * 0.5;
      animParts.legs[3].rotation.x = Math.sin(time) * 0.5;
  } else if (bodyType === 'FLOATING') {
      // Spin rings
      if(animParts.floaters[0]) animParts.floaters[0].rotation.z += 0.05;
      charGroup.rotation.z = Math.sin(time * 0.5) * 0.1;
  }

  renderer.render(scene, camera);
}
animate();

// --- MODE HANDLING ---
window.addEventListener('message', (event) => {
    const { type, value } = event.data;
    if (type === 'SET_MODE') {
        if (value === 'BATTLE') {
            // BATTLE MODE: Hide Environment, Lock Camera
            habitatGroup.visible = false;
            controls.autoRotate = false;
            controls.enabled = true; 
            // Zoom in front view for battle
            camera.position.set(4, 2, 8); 
            camera.lookAt(0,0,0);
        } else {
            // HABITAT MODE
            habitatGroup.visible = true;
            controls.autoRotate = true;
            camera.position.set(15,15,15);
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
    // ... (Implementation same as before, just preserving imports)
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
    // Reuse generic builder for consistency in style, but ideally this uses AI for unique details
    // For now, we return the "Smart Arcade" builder
    return getGenericVoxel('Metal', bodyType);
};

export const fuseVoxelScene = async (petA: MonsterStats, petB: MonsterStats) => {
    const visual_design = `A fusion of ${petA.name} and ${petB.name}.`;
    const code = getGenericVoxel(petA.element, petA.bodyType);
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
    const { dominant, protocolName } = determineEvolutionPath({ 
        atk: pet.atk, def: pet.def, spd: pet.spd, happiness: pet.happiness || 50 
    });
    let nextStage: MonsterStage = 'Pro';
    if (pet.stage === 'Noob') nextStage = 'Pro';
    else if (pet.stage === 'Pro') nextStage = 'Elite';
    else if (pet.stage === 'Elite') nextStage = 'Legend';

    const code = getGenericVoxel(pet.element, pet.bodyType); // In real app, AI would make it bigger/cooler
    
    return { 
        code, 
        visual_design: "Evolved Form", 
        nextStage,
        nextName: `Neo ${pet.name}`,
        protocolName
    };
}
