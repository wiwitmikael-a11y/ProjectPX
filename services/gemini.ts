
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText } from "../utils/html";
import { OBJECT_ARCHETYPES, SKILL_DATABASE } from "./gameData";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// UUID Helper
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Robust JSON Parsing
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
  You are a World-Class Three.js Voxel Engine Developer. 
  Transform the input into a **"RIGGED PIXUPET"** scene.
  
  ### 1. CORE SETUP:
  - **IMPORT MAP:**
    \`\`\`html
    <script type="importmap">
      {
        "imports": {
          "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
          "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
        }
      }
    </script>
    \`\`\`
  - **RENDERER:** \`new THREE.WebGLRenderer({ alpha: true, antialias: true });\`
  - **SCENE:** \`scene.background = null;\` (Initially transparent).
  
  ### 2. INFINITE HORIZON (SKY DOME SHADER):
  - **CRITICAL:** The world must look infinite.
  - Create a large SphereGeometry (radius 120).
  - Use a **ShaderMaterial** with \`side: THREE.BackSide\`.
  - **Vertex Shader:**
    \`varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4( position, 1.0 ); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }\`
  - **Fragment Shader:**
    \`uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main() { float h = normalize( vWorldPosition + offset ).y; gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 ); }\`
  - **Uniforms:** \`topColor\` (Sky Color), \`bottomColor\` (Ground Color matching element), \`offset: 33\`, \`exponent: 0.6\`.
  - **Result:** The floor must blend seamlessly into the horizon.

  ### 3. RIGGING & HIERARCHY:
  - **Structure:**
    - \`heroGroup\` (Root).
      - \`bodyGroup\` (Torso).
        - \`headGroup\`, \`armL\`, \`armR\`, \`legL\`, \`legR\`.
  
  ### 4. PHYSICS & ANIMATION (FIX MOVEMENT):
  - **Global State:** \`window.animState = 'IDLE';\`
  - **Loop Logic (\`animate()\`)**:
    - **WANDERING:**
       - Pick random target on the ground plane.
       - **ROTATION (CRITICAL):** Use \`heroGroup.lookAt(target)\`. Ensure the model faces the direction it is moving. Do NOT walk backwards.
       - Move forward along Z-axis relative to rotation.
    - **ANIMATIONS:**
       - Use \`Math.sin(time)\` for limbs.
       - **JUMP:** If state is JUMP, translate Y up/down.
       - **ATTACK:** Rotate arms aggressively.

  ### 5. MESSAGING SYSTEM:
  - Handle: \`SET_MODE\` (Hide habitat/sky dome when value is 'BATTLE'), \`ANIM_STATE\`, \`CAMERA_MOVE\`.

  ### 6. CLEAN OUTPUT:
  - **STRICT RULE:** NO TEXTURES containing text, logos, or brands. Use procedural colors only.
  - Valid HTML/JS only.
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
            TASK: Identify object, map to Element. Create Stats.
            VISUAL_DESIGN: Detailed description for Voxel Artist AND Anime Artist to match perfectly. Include color palette.
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
      dateCreated: Date.now()
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

export const generateVoxelScene = async (imageBase64: string, visualDescription: string, onThoughtUpdate?: (thought: string) => void): Promise<string> => {
  let contentsPart: any[] = [];
  if (imageBase64 && imageBase64.startsWith('data:')) {
      contentsPart.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
  }
  const PROMPT_WITH_CONTEXT = `${VOXEL_PROMPT}\n\n### TARGET VISUAL_DESIGN:\n"${visualDescription}"`;
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
    const code = await generateVoxelScene("", visual_design);
    return { code, visual_design, name: `${petA.name.substring(0, 3)}${petB.name.substring(petB.name.length-3)}`, element: petA.element };
};

export const evolveVoxelScene = async (pet: MonsterStats) => {
     const visual_design = `Evolved Mega Form of ${pet.name}. ${pet.visual_design} but bigger, stronger armor, glowing energy aura.`;
     const code = await generateVoxelScene("", visual_design);
     return { code, visual_design };
}

export const getGenericVoxel = (element: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
  </script>
</head>
<body style="margin:0; overflow:hidden; background:transparent;">
<script type="module">
  import * as THREE from 'three';
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(20, 20, 20);
  camera.lookAt(0,0,0);
  
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  
  const group = new THREE.Group();
  scene.add(group);

  // A Simple Slime Monster Voxel
  const color = 0x${element === 'Fire' ? 'FF4444' : element === 'Water' ? '4444FF' : element === 'Grass' ? '44FF44' : 'AAAAAA'};
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({ color });
  
  // Body
  for(let x=-2; x<=2; x++) {
      for(let y=0; y<=2; y++) {
          for(let z=-2; z<=2; z++) {
              if(Math.random()>0.2) {
                  const m = new THREE.Mesh(geo, mat);
                  m.position.set(x,y,z);
                  group.add(m);
              }
          }
      }
  }
  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  
  const eyeL = new THREE.Mesh(geo, eyeMat); eyeL.position.set(-1, 1, 2.1); group.add(eyeL);
  const pupL = new THREE.Mesh(geo, pupilMat); pupL.position.set(-1, 1, 2.3); pupL.scale.set(0.5,0.5,0.5); group.add(pupL);

  const eyeR = new THREE.Mesh(geo, eyeMat); eyeR.position.set(1, 1, 2.1); group.add(eyeR);
  const pupR = new THREE.Mesh(geo, pupilMat); pupR.position.set(1, 1, 2.3); pupR.scale.set(0.5,0.5,0.5); group.add(pupR);

  // Animation
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    
    // Idle bounce
    group.position.y = Math.abs(Math.sin(t * 3)) * 2;
    group.scale.y = 1 - Math.sin(t*10)*0.1;
    group.scale.x = 1 + Math.sin(t*10)*0.05;
    group.scale.z = 1 + Math.sin(t*10)*0.05;

    group.rotation.y += 0.01;
    
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('message', (e) => {
      if(e.data.type === 'ANIM_STATE' && e.data.value === 'ATTACK') {
          // Attack Animation trigger
          const jump = setInterval(() => {
               group.position.z += 0.5;
          }, 16);
          setTimeout(() => {
              clearInterval(jump);
              group.position.z = 0;
          }, 500);
      }
  });
</script>
</body>
</html>`;
};
