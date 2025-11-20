
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText } from "../utils/html";
import { OBJECT_ARCHETYPES, BodyType, BIOME_DEFINITIONS, AITactic } from "./gameData";

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

export const VOXEL_PROMPT = `
  You are a World-Class Three.js Developer specializing in "AAA Indie" aesthetics (Neo-Pop/Voxel).
  Create a **GOD-TIER RPG HABITAT**.
  
  ### 1. CORE SETUP
  - **Imports:** standard Three.js (0.160.0) + SimplexNoise.
  - **Renderer:** \`new THREE.WebGLRenderer({ alpha: true, antialias: true });\`
  - **Scene:** \`scene.background = null;\` (Transparency handled by app).
  - **Camera & Controls (STRICT):** 
    - Use \`OrbitControls\`.
    - \`controls.enablePan = false;\` (LOCK TARGET)
    - \`controls.enableDamping = true;\`
    - \`controls.minDistance = 14;\` (Keep pet in view)
    - \`controls.maxDistance = 28;\` (Don't drift too far)
    - \`controls.maxPolarAngle = Math.PI / 2 - 0.1;\` (Never go below ground)

  ### 2. PROCEDURAL TERRAIN (SEAMLESS)
  - **GRID:** x: -25 to 25, z: -25 to 25.
  - **NOISE:** Use \`SimplexNoise\` for terrain height y. Store this noise function to use in Animation loop.
  - **FLOOR:** Create a seamless voxel terrain.

  ### 3. THE "JUICE" - AAA VISUALS (CRITICAL)
  - **CEL-SHADING (INVERTED HULL):** For every voxel mesh of the PET (Body, Head, Limbs), create a duplicate mesh:
    - \`material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });\`
    - \`scale.setScalar(1.06);\`
    - This creates a thick black "Neo-Pop" outline.
  - **HIT STOP:** Implement a global \`let hitStop = 0;\`. In \`animate()\`, if \`hitStop > 0\`, \`hitStop -= delta;\` and SKIP animation updates.

  ### 4. PROCEDURAL ANIMATION RIGGING (IK)
  - **Structure:** \`heroGroup\` > \`body\` > \`head\`, \`legL\`, \`legR\`.
  - **Fake IK (Terrain Matching):**
    - In \`animate()\`: Calculate the ground height at the Leg's world X/Z using the Noise function.
    - \`leg.position.y = groundHeightAt(leg.x, leg.z)\`.
    - This ensures feet stick to the terrain slopes perfectly while walking.
  - **Head Tracking:** \`head.lookAt(camera.position)\` (The pet watches the player).

  ### 5. WEATHER SYSTEM
  - Listen for messages: \`window.addEventListener('message', (e) => { if(e.data.type === 'SET_WEATHER') ... })\`
  - **RAIN:** Create a particle system (InstancedMesh) of thin blue boxes falling. Visible only if \`weather === 'RAIN'\`.
  - **MIST:** Adjust \`scene.fog\` density.

  ### 6. LOGIC
  - Listen for \`PAUSE\`: If paused, stop rotation/movement, but keep rendering.
  - **Output:** Raw HTML string only.
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
  stage: 'Rookie' | 'Champion' | 'Ultimate' | 'Mega'; 
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
}

export const analyzeObject = async (imageBase64: string): Promise<MonsterStats> => {
  try {
    if (!imageBase64) throw new Error("Image data is missing");
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeMatch = imageBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analyze object for 'Pixupet'.
            ARCHETYPES: ${JSON.stringify(OBJECT_ARCHETYPES)}
            TASK: Identify object, map to Element. Determine BODY_TYPE (BIPED, QUADRUPED, FLOATING, WHEELED). Create Stats.
            VISUAL_DESIGN: Extremely detailed description of the monster's appearance, colors, and body shape for a 3D Artist. NO LOGOS OR BRAND NAMES.
            HABITAT_DESC: Describe the ideal biome (e.g., "Volcanic Crater with Obsidian spikes" for Fire).
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
            stage: { type: Type.STRING }, 
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
      tactic: 'BALANCED' // Default Tactic
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1', optimize: boolean = true): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    throw new Error("No image generated.");
  } catch (error) {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }
};

export const generateCardArt = async (monsterDescription: string, objectName: string, visualDesign: string): Promise<string> => {
    const prompt = `Anime trading card illustration of: ${visualDesign}. 
    Subject: ${objectName} transformed into a Pixupet monster.
    Style: High-quality anime art, vibrant colors, thick black outlines (Neo-Pop).
    CONSISTENCY: Must match the visual description exactly.
    NEGATIVE PROMPT: Text, Logo, Brand Name, Watermark, Blur, Realistic, Trademark, Signage, Writing, Letters.
    Action: Dynamic battle stance.`;
    
    return generateImage(prompt, '3:4', false);
};

export const generateVoxelScene = async (imageBase64: string, visualDescription: string, bodyType: string = 'BIPED'): Promise<string> => {
  let contentsPart: any[] = [];
  // Inject specific AAA Juice instructions into the prompt for this request
  const JUICE_INSTRUCTIONS = `
    CRITICAL: Implement 'Inverted Hull' outlining (black back-faced mesh scaled 1.05x) for all pet parts.
    CRITICAL: Implement 'Terrain Matching IK'. Legs must move up/down based on noise(x,z) of floor.
    CRITICAL: Lock Camera pan. Limit Zoom.
  `;
  const PROMPT_WITH_CONTEXT = `${VOXEL_PROMPT}\n\n### TARGET VISUAL_DESIGN:\n"${visualDescription}"\n### BODY_TYPE: ${bodyType}\n### INSTRUCTIONS: ${JUICE_INSTRUCTIONS}`;
  contentsPart.push({ text: PROMPT_WITH_CONTEXT });

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: { parts: contentsPart },
      config: { thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 } },
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
    return getGenericVoxel('Dark'); 
  }
};

export const fuseVoxelScene = async (petA: MonsterStats, petB: MonsterStats) => {
    const visual_design = `A fusion chimera of ${petA.name} and ${petB.name}. ${petA.visual_design} combined with ${petB.visual_design}.`;
    const code = await generateVoxelScene("", visual_design, petA.bodyType);
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
     const visual_design = `Evolved Mega Form of ${pet.name}. ${pet.visual_design} but bigger, stronger armor, glowing energy aura.`;
     const code = await generateVoxelScene("", visual_design, pet.bodyType);
     return { code, visual_design };
}

export const getGenericVoxel = (element: string) => {
    const colors: any = {
        Fire: '0xFF5555', Water: '0x5555FF', Grass: '0x55FF55', Electric: '0xFFFF55',
        Psychic: '0xFF55FF', Metal: '0xAAAAAA', Dark: '0x333333', Light: '0xFFFFFF',
        Spirit: '0xAA55FF', Toxic: '0xAAFF55'
    };
    const colorHex = colors[element] || '0xAAAAAA';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>body { margin: 0; overflow: hidden; background: transparent !important; }</style>
    <script type="importmap">
    {
        "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
        }
    }
    </script>
</head>
<body>
<script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 25;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // Slime Body with Outline
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: ${colorHex}, roughness: 0.2, metalness: 0.1 });
    const body = new THREE.Mesh(geometry, material);
    body.scale.y = 0.8; 
    heroGroup.add(body);
    
    // INVERTED HULL (OUTLINE)
    const outlineGeo = geometry.clone();
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    outline.scale.setScalar(1.05); 
    heroGroup.add(outline);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.3, 0.3, 0.6);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.3, 0.3, 0.6);
    
    heroGroup.add(leftEye);
    heroGroup.add(rightEye);

    let paused = false;
    window.addEventListener('message', (e) => {
        if(e.data.type === 'PAUSE') paused = e.data.value;
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        if(paused) return;

        const t = clock.getElapsedTime();
        
        // Simple bounce
        heroGroup.position.y = Math.abs(Math.sin(t * 3)) * 0.2;
        
        renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
</script>
</body>
</html>`;
};
