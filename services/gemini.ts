/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText } from "../utils/html";
import { BodyType, AITactic, determineEvolutionPath, MonsterStage, getProceduralMonsterArt } from "./gameData";

// Ensure we use the API key from the environment
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

// --- THE ENGINE CORE ---
export const VOXEL_PROMPT = `
  You are a Senior Graphics Engineer specializing in WebGL and "Juicy" Game Feel.
  Create a **High-Fidelity Voxel Habitat**.
  
  ### 1. CORE SETUP
  - **Imports:** standard Three.js (0.160.0) + SimplexNoise.
  - **Renderer:** \`new THREE.WebGLRenderer({ alpha: true, antialias: true });\`
  - **Camera:** Use \`OrbitControls\`.
    - **CRITICAL:** \`controls.enablePan = false;\` (Lock target to pet).
    - **CRITICAL:** \`controls.minDistance = 12; controls.maxDistance = 20;\` (Forced framing).
    - **CRITICAL:** \`controls.maxPolarAngle = Math.PI / 2 - 0.1;\` (Prevent going under ground).
  
  ### 2. THE "JUICE" (VISUALS & ANIMATION)
  - **NEO-POP OUTLINES (Inverted Hull Method):**
    - For EVERY mesh part of the pet (head, body, limbs, armor):
    - Create a clone: \`const outline = originalMesh.clone();\`
    - Material: \`new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });\`
    - Scale: \`outline.scale.multiplyScalar(1.06);\`
    - Add outline to the same parent group.
  - **COLORS:** Use BRIGHT, SATURATED colors (Pastels, Neon). Avoid dark muddy colors.
  - **PROCEDURAL IK (Inverse Kinematics):**
    - Use \`SimplexNoise\` to generate the floor height \`y\` at any \`x, z\`.
    - In \`animate()\`:
      - For each foot/wheel: Calculate \`groundHeight = getNoiseHeight(foot.worldPosition.x, foot.worldPosition.z)\`.
      - Force \`foot.position.y\` to match \`groundHeight\` relative to the body.
      - This ensures feet stick to the hills/slopes while walking.
  - **HEAD TRACKING:**
    - In \`animate()\`: \`headGroup.lookAt(camera.position);\`.
  - **HIT STOP (Impact Frames):**
    - Global var: \`let hitStopTimer = 0;\`.
    - In \`animate()\`: \`if (hitStopTimer > 0) { hitStopTimer -= delta; return; } // Skip frame updates\`.
    - Listen for: \`window.addEventListener('message', (e) => { if(e.data.type==='HIT_STOP') hitStopTimer = 0.15; });\`

  ### 3. WEATHER SYSTEM
  - Listen for: \`window.addEventListener('message', (e) => { if(e.data.type === 'SET_WEATHER') updateWeather(e.data.value); });\`
  - **RAIN:** Create a particle system of blue lines that only renders when weather is 'RAIN'.
  - **STORM:** Darker ambient light + flash effect.
  - **CLEAR:** Bright sunlight.

  ### 4. PROCEDURAL TERRAIN
  - Grid: x: -30 to 30, z: -30 to 30.
  - Use the noise function to create gentle rolling hills.
  - Seamless infinite scrolling illusion if possible, or just a large detailed island.

  ### Output: Raw HTML string only.
`;

export interface Move {
  name: string;
  type: 'Physical' | 'Special' | 'Status';
  power: number;
  accuracy: number;
  description: string;
}

export interface MonsterStats {
  id: string; 
  dateCreated: number;
  name: string;
  element: 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Psychic' | 'Metal' | 'Dark' | 'Light' | 'Spirit' | 'Toxic';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Glitch';
  stage: MonsterStage; 
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'; 
  nature: string; 
  personality: string; 
  visual_design: string; 
  bodyType: BodyType;
  tactic?: AITactic;
  potential: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  int: number; 
  description: string;
  ability: string;
  moves: Move[]; 
  happiness?: number;
}

export const getGenericVoxel = (element: string = 'Neutral'): string => {
    const colors: Record<string, string> = {
        Fire: '0xff4400', Water: '0x0088ff', Grass: '0x00cc44',
        Electric: '0xffcc00', Psychic: '0xaa00ff', Metal: '0x888888',
        Dark: '0x220044', Light: '0xffffee', Spirit: '0x6600cc', Toxic: '0x88cc00'
    };
    const c = colors[element] || '0xcccccc';

    return `<!DOCTYPE html>
<html>
<head>
<style>body{margin:0;overflow:hidden;background:transparent;}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(15,15,15);
const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 2.0;
controls.minDistance = 10; controls.maxDistance = 30;

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(10,20,10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const group = new THREE.Group();
scene.add(group);

// Base body
const mat = new THREE.MeshStandardMaterial({color: ${c}});
const geo = new THREE.BoxGeometry(4,4,4);
const mesh = new THREE.Mesh(geo, mat);
group.add(mesh);

// Eyes
const eyeGeo = new THREE.BoxGeometry(1,1,0.5);
const eyeMat = new THREE.MeshBasicMaterial({color:0x000000});
const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(-1, 0.5, 2); group.add(e1);
const e2 = new THREE.Mesh(eyeGeo, eyeMat); e2.position.set(1, 0.5, 2); group.add(e2);

// Outline
const outlineMat = new THREE.MeshBasicMaterial({color:0x000000, side:THREE.BackSide});
const outline = new THREE.Mesh(geo, outlineMat);
outline.scale.set(1.05,1.05,1.05);
group.add(outline);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  group.position.y = Math.sin(Date.now() * 0.003) * 0.5;
  renderer.render(scene, camera);
}
animate();
window.onresize = () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
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

    // Standard Flash model is most reliable for API keys
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analyze this object and **TRANSFORM IT** into a "Pixupet" Digital Monster.
            
            **CRITICAL RULES FOR NAME & COPYRIGHT:**
            1. **IGNORE TEXT:** Do NOT use brand names or text written on the object. (e.g., if it says "Coca Cola", call it "Soda Bot").
            2. **CONCEPT ONLY:** Name the monster based on the object's FUNCTION or SHAPE.
            3. **NAMING STYLE:** Use a "Tech/Gamer" suffix: -Bot, -Droid, -Unit, -Pixel, -Glitch, -Bit.
               - *Example:* Shoe -> "Sprint Unit Noob".
               - *Example:* Plant -> "Eco Droid Noob".
               - *Example:* Mug -> "Ceramic Vessel Noob".
            
            **VISUAL RULES:**
            - All scans start as "Noob" Stage (Small, cute, chibi).
            - Visual design should be "Voxel Pop Art".

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
            stage: { type: Type.STRING, enum: ['Noob'] }, // STRICTLY NOOB
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
            moves: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  power: { type: Type.INTEGER },
                  accuracy: { type: Type.INTEGER },
                  description: { type: Type.STRING }
                }
              }
            }
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
    // Since we can't easily use Imagen with API keys reliably, use the procedural generator
    // This ensures copyright safety and 100% uptime.
    // We use the objectName to seed the procedural generation
    return getProceduralMonsterArt(objectName, "Psychic"); // Defaulting element or need to pass it.
};

export const generateVoxelScene = async (imageBase64: string, visualDescription: string, bodyType: string = 'BIPED'): Promise<string> => {
  let contentsPart: any[] = [];
  
  const JUICE_INSTRUCTIONS = `
    ## CRITICAL ART DIRECTION:
    1. **GAMIFY:** Build the "Pixupet" described.
    2. **STAGE AWARENESS:**
       - **NOOB:** Chunky, 8-bit vibe, simple, big head, small body.
       - **PRO:** Defined limbs, cool props, teenager vibe.
       - **ELITE:** High detail, armor, weapons, serious look.
       - **LEGEND:** God-tier, massive scale, aura, floating parts.
    3. **OUTLINES:** You MUST implement the 'Inverted Hull' method.
    4. **PHYSICS/IK:** Feet/Base must track ground noise height.
    5. **COLORS:** Use BRIGHT, HAPPY COLORS. Avoid dark sci-fi tones. Think Splatoon or Nintendo.
  `;
  
  // NOTE: We do NOT pass imageBase64 anymore to avoid the model just reconstructing the photo.
  // We rely purely on the text description generated by the analysis phase.
  const PROMPT_WITH_CONTEXT = `${VOXEL_PROMPT}\n\n### TARGET VISUAL_DESIGN:\n"${visualDescription}"\n### BODY_TYPE: ${bodyType}\n### INSTRUCTIONS: ${JUICE_INSTRUCTIONS}`;
  contentsPart.push({ text: PROMPT_WITH_CONTEXT });

  try {
    // Use standard flash for reliable code generation
    const response = await ai.models.generateContentStream({
      model: 'gemini-1.5-flash',
      contents: { parts: contentsPart },
    });
    let fullHtml = "";
    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          const p = part as any;
          if (p.text) fullHtml += p.text;
        }
      }
    }
    return extractHtmlFromText(fullHtml);
  } catch (error) {
    console.error("Voxel generation error:", error);
    return getGenericVoxel('Dark'); 
  }
};

export const fuseVoxelScene = async (petA: MonsterStats, petB: MonsterStats) => {
    const visual_design = `A fusion chimera of ${petA.name} and ${petB.name}. ${petA.visual_design} combined with ${petB.visual_design}. Ensure it has combined armor elements from both.`;
    const code = await generateVoxelScene("", visual_design, petA.bodyType);
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
    const { dominant, alignment, protocolName } = determineEvolutionPath({ 
        atk: pet.atk, 
        def: pet.def, 
        spd: pet.spd, 
        happiness: pet.happiness || 50 
    });

    let nextStage: MonsterStage = 'Pro';
    let scaleMultiplier = 1.0;
    
    const currentStage = pet.stage as string;
    
    if (currentStage === 'Noob' || currentStage === 'Spark') {
        nextStage = 'Pro';
        scaleMultiplier = 1.5;
    } else if (currentStage === 'Pro' || currentStage === 'Surge') {
        nextStage = 'Elite';
        scaleMultiplier = 2.0;
    } else if (currentStage === 'Elite' || currentStage === 'Turbo') {
        nextStage = 'Legend';
        scaleMultiplier = 3.0;
    }

    let evolutionPrompt = `Current Stage: ${pet.stage}. Next Stage: ${nextStage}. Build Type: ${protocolName}.`;

    if (dominant === 'ATTACK') {
        evolutionPrompt += " The creature evolves via DPS BUILD. Big fists, weapons, aggressive look.";
    } else if (dominant === 'DEFENSE') {
        evolutionPrompt += " The creature evolves via TANK BUILD. Heavy shell, shields, sturdy legs.";
    } else if (dominant === 'SPEED') {
        evolutionPrompt += " The creature evolves via SPEEDRUN BUILD. Wheels, wings, thrusters, sleek.";
    }

    if (alignment === 'CORRUPTED') {
        evolutionPrompt += " WARNING: TOXIC PLAYER VIBES. Evolution is Glitchy/Edgy.";
    } else if (alignment === 'LUMINOUS') {
        evolutionPrompt += " GG WP VIBES. Evolution is Angelic/Clean.";
    }

    const visual_design = `
        Evolution: ${pet.name} -> ${nextStage}.
        Base Form: ${pet.visual_design}.
        
        ART DIRECTION:
        - **Complexity:** ${nextStage === 'Pro' ? 'Medium (Teenager)' : nextStage === 'Elite' ? 'High (Cool Gear)' : 'God-Tier (Massive)'}.
        - **Scale:** This model should look ${scaleMultiplier}x larger/taller than the previous one.
        - **Theme:** ${evolutionPrompt}
        - **Style:** Vector Pop Art Voxel.
    `;

    let prefix = "";
    if (nextStage === 'Pro') prefix = alignment === 'CORRUPTED' ? "Edgy" : "Neo";
    if (nextStage === 'Elite') prefix = dominant === 'ATTACK' ? "Striker" : dominant === 'DEFENSE' ? "Guardian" : "Dasher";
    if (nextStage === 'Legend') prefix = "Omega";

    const nextName = `${prefix} ${pet.name}`;

    const code = await generateVoxelScene("", visual_design, pet.bodyType);
    
    return { 
        code, 
        visual_design, 
        nextStage,
        nextName,
        protocolName
    };
}
