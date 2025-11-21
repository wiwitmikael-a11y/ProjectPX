
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { extractHtmlFromText } from "../utils/html";
import { BodyType, AITactic, determineEvolutionPath, MonsterStage } from "./gameData";

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
            
            **CRITICAL RULE: ALL NEW SCANS START AS "SPARK" STAGE.**
            Sparks are the "Baby/Rookie" data form. They are SMALL, CHIBI, COMPACT, and Cute. They NEVER have heavy armor or complex weapons yet.
            
            TASK:
            1. Identify the base object (e.g., Bottle, Shoe, Plant).
            2. **GAMIFY (SPARK FORM):** Reimagine it as a small digital creature.
               - *Example:* Bottle -> "Aqua Slime Spark".
               - *Example:* Shoe -> "Speedy Pup Spark".
            
            3. VISUAL_DESIGN: Write a prompt for a voxel artist. Describe a SMALL, BIG-HEADED, SIMPLE geometry creature.
               Focus on the core essence of the object, not the details.
            
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
            stage: { type: Type.STRING, enum: ['Spark'] }, // STRICTLY SPARK
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
      stage: 'Spark', 
      happiness: 50
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

// Fallback SVG generator to prevent crashes if API fails
const getFallbackImage = (seed: string) => {
    const hue = Math.floor(Math.random() * 360);
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="400" fill="#111"/>
            <circle cx="150" cy="200" r="100" fill="hsl(${hue}, 70%, 50%)" opacity="0.5"/>
            <text x="150" y="200" fill="white" text-anchor="middle" font-family="monospace" font-size="20">IMAGE SYSTEM OFFLINE</text>
            <text x="150" y="230" fill="#666" text-anchor="middle" font-family="monospace" font-size="12">${seed}</text>
        </svg>
    `)}`;
}

export const generateImage = async (prompt: string, aspectRatio: string = '1:1', optimize: boolean = true): Promise<string> => {
  try {
    // Try Imagen 3
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as any,
            outputMimeType: 'image/jpeg'
        }
    });
    
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
        return `data:image/jpeg;base64,${base64}`;
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.warn("Art Generation Failed (Likely API Key Permission), using fallback.", error);
    return getFallbackImage(prompt.substring(0, 10));
  }
};

export const generateCardArt = async (monsterDescription: string, objectName: string, visualDesign: string): Promise<string> => {
    const prompt = `Anime Trading Card Art. Character: ${visualDesign}. Style: Neo-Pop, Bold Outlines, Cyberpunk Background.`;
    return generateImage(prompt, '3:4', false);
};

export const generateVoxelScene = async (imageBase64: string, visualDescription: string, bodyType: string = 'BIPED'): Promise<string> => {
  let contentsPart: any[] = [];
  
  const JUICE_INSTRUCTIONS = `
    ## CRITICAL ART DIRECTION:
    1. **GAMIFY:** Build the "Pixupet" described.
    2. **STAGE AWARENESS:** If description says "Spark", keep voxels chunky and simple (8-bit style). If "Turbo" or "Nova", use high voxel density and complex attachments.
    3. **OUTLINES:** You MUST implement the 'Inverted Hull' method.
    4. **PHYSICS/IK:** Feet/Base must track ground noise height.
  `;
  
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

    let nextStage: MonsterStage = 'Surge';
    let scaleMultiplier = 1.0;
    
    const currentStage = pet.stage as string;
    
    if (currentStage === 'Spark' || currentStage === 'Rookie') {
        nextStage = 'Surge';
        scaleMultiplier = 1.5;
    } else if (currentStage === 'Surge' || currentStage === 'Champion') {
        nextStage = 'Turbo';
        scaleMultiplier = 2.0;
    } else if (currentStage === 'Turbo' || currentStage === 'Ultimate') {
        nextStage = 'Nova';
        scaleMultiplier = 3.0;
    }

    let evolutionPrompt = `Current Stage: ${pet.stage}. Next Stage: ${nextStage}. Protocol: ${protocolName}.`;

    if (dominant === 'ATTACK') {
        evolutionPrompt += " The creature evolves via CRIMSON PROTOCOL. Physical weapons manifest: Energy Blades, Giant Claws, or Cannons. Stance is aggressive and predatory.";
    } else if (dominant === 'DEFENSE') {
        evolutionPrompt += " The creature evolves via TITANIUM PROTOCOL. Heavy Armor plating manifests. Shields, domes, or crystallized skin. Stance is unmovable.";
    } else if (dominant === 'SPEED') {
        evolutionPrompt += " The creature evolves via AZURE PROTOCOL. Thrusters, Wings, Wheels, or Hover-Tech manifest. Body becomes streamlined and aerodynamic.";
    }

    if (alignment === 'CORRUPTED') {
        evolutionPrompt += " WARNING: HAPPINESS CRITICAL. Evolution is GLITCHED/VIRUS type. Broken geometry, dark aura, jagged red eyes, erratic appearance.";
    } else if (alignment === 'LUMINOUS') {
        evolutionPrompt += " HAPPINESS MAXIMAL. Evolution is ASCENDED/DATA-ANGEL type. Golden rings, white aura, majestic floating elements.";
    }

    const visual_design = `
        Evolution: ${pet.name} -> ${nextStage}.
        Base Form: ${pet.visual_design}.
        
        ART DIRECTION:
        - **Complexity:** ${nextStage === 'Surge' ? 'Medium (Teenager)' : nextStage === 'Turbo' ? 'High (Mecha/Armored)' : 'God-Tier (Complex Geometry)'}.
        - **Scale:** This model should look ${scaleMultiplier}x larger/taller than the previous one.
        - **Theme:** ${evolutionPrompt}
    `;

    let prefix = "";
    if (nextStage === 'Surge') prefix = alignment === 'CORRUPTED' ? "Dark" : "Neo";
    if (nextStage === 'Turbo') prefix = dominant === 'ATTACK' ? "War" : dominant === 'DEFENSE' ? "Iron" : "Jet";
    if (nextStage === 'Nova') prefix = "Omega";

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
    camera.position.set(0, 8, 18); 
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false; 
    controls.minDistance = 8;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // Slime Body
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: ${colorHex}, roughness: 0.2, metalness: 0.1 });
    const body = new THREE.Mesh(geometry, material);
    body.scale.y = 0.8; 
    heroGroup.add(body);
    
    const outlineGeo = geometry.clone();
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    outline.scale.setScalar(1.05); 
    heroGroup.add(outline);
    
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
