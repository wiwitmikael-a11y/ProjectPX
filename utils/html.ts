/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


/**
 * Extracts a complete HTML document from a string that might contain
 * conversational text, markdown code blocks, etc.
 */
export const extractHtmlFromText = (text: string): string => {
  if (!text) return "";

  // 1. Try to find a complete HTML document structure (most reliable)
  // Matches <!DOCTYPE html>...</html> or <html>...</html>, case insensitive, spanning multiple lines
  const htmlMatch = text.match(/(<!DOCTYPE html>|<html)[\s\S]*?<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }

  // 2. Fallback: Try to extract content from markdown code blocks if specific HTML tags weren't found
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 3. Return raw text if no structure is found (trim whitespace)
  return text.trim();
};

/**
 * Injects CSS into the HTML to hide common text elements and forces transparency
 */
export const hideBodyText = (html: string): string => {
  const cssToInject = `
    <style>
      /* Hides common overlay IDs and classes used in Three.js examples and generated code */
      #info, #loading, #ui, #instructions, .label, .overlay, #description {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      /* Ensure the body doesn't show selected text interaction */
      body, html {
        background-color: transparent !important; /* Force transparent body */
        background: none !important;
        margin: 0;
        overflow: hidden;
      }
      canvas {
        display: block;
        outline: none;
      }
    </style>
  `;

  if (html.toLowerCase().includes('</head>')) {
    return html.replace(/<\/head>/i, `${cssToInject}</head>`);
  }
  return html + cssToInject;
};

/**
 * Forces Three.js WebGLRenderer to use alpha: true and removes scene background colors
 */
export const makeBackgroundTransparent = (html: string): string => {
  let newHtml = html;

  // 1. Inject Transparency styles if not already present (hideBodyText does this, but we reinforce)
  if (!newHtml.includes('background-color: transparent')) {
      newHtml = hideBodyText(newHtml);
  }

  // 2. Force WebGLRenderer to have alpha: true
  // We look for the constructor and inject the property
  // Matches: new THREE.WebGLRenderer({ ... })
  newHtml = newHtml.replace(
    /new\s+THREE\.WebGLRenderer\s*\(\s*\{/g, 
    'new THREE.WebGLRenderer({ alpha: true, '
  );
  
  // Handle empty constructor case: new THREE.WebGLRenderer()
  if (!newHtml.includes('alpha: true')) {
      newHtml = newHtml.replace(
          /new\s+THREE\.WebGLRenderer\s*\(\s*\)/g, 
          'new THREE.WebGLRenderer({ alpha: true, antialias: true })'
      );
  }

  // 3. Nuke scene.background assignments
  // This is critical. If scene.background is set, alpha on renderer doesn't matter.
  // Matches: scene.background = ...
  newHtml = newHtml.replace(/scene\.background\s*=\s*[^;]+;/g, '// scene.background removed for AR transparency;');
  
  // 4. Ensure Clear Color is transparent (if setClearColor is used)
  newHtml = newHtml.replace(/renderer\.setClearColor\([^)]+\);?/g, 'renderer.setClearColor( 0x000000, 0 );');

  // 5. Inject a safety script at the end of body to force transparency at runtime
  // This catches cases where the LLM might use variables for background colors
  const safetyScript = `
    <script>
      setTimeout(() => {
        try {
          // Try to find the scene variable in global scope if leaked, or just rely on the user interacting
          // This is a best-effort cleanup
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(c => c.style.background = 'transparent');
        } catch(e) {}
      }, 100);
    </script>
  `;
  
  if (newHtml.includes('</body>')) {
      newHtml = newHtml.replace('</body>', `${safetyScript}</body>`);
  } else {
      newHtml += safetyScript;
  }

  return newHtml;
};

/**
 * Three.js scenes are often too zoomed out
 */
export const zoomCamera = (html: string, zoomFactor: number = 0.8): string => {
  // A simple heuristic to pull the camera closer if it's set via position.set
  const regex = /camera\.position\.set\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/g;

  return html.replace(regex, (match, x, y, z) => {
    const newX = parseFloat(x) * zoomFactor;
    const newY = parseFloat(y) * zoomFactor;
    const newZ = parseFloat(z) * zoomFactor;
    return `camera.position.set(${newX}, ${newY}, ${newZ})`;
  });
};