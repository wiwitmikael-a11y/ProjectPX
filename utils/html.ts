
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

  // 1. Strict: Look for the opening and closing html tags.
  // This regex grabs everything from the first <!DOCTYPE or <html down to the last </html>
  const htmlMatch = text.match(/(?:<!DOCTYPE\s+html>|<html[\s\S]*?>)[\s\S]*?<\/html>/i);
  
  if (htmlMatch) {
    return htmlMatch[0];
  }

  // 2. Fallback: Try to find markdown code blocks if specific HTML tags weren't found
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    // Check if the content looks like HTML
    if (codeBlockMatch[1].includes('<') && codeBlockMatch[1].includes('>')) {
        return codeBlockMatch[1].trim();
    }
  }

  // 3. If all else fails, return the text BUT scrub common conversational lines if they exist at the top
  // This is a "Hail Mary" for malformed responses
  if (text.includes("<!DOCTYPE html>")) {
      const idx = text.indexOf("<!DOCTYPE html>");
      return text.substring(idx);
  }

  return text.trim();
};

/**
 * Injects CSS into the HTML to hide common text elements and forces transparency
 */
export const hideBodyText = (html: string): string => {
  const cssToInject = `
    <style>
      /* AGGRESSIVE CLEANUP */
      body > *:not(canvas):not(script) {
         display: none !important;
         opacity: 0 !important;
         pointer-events: none !important;
      }
      
      /* Specifically target common overlay IDs used in Three.js examples */
      #info, #loading, #ui, #instructions, .label, .overlay, #description, #debug, div[style*="position: absolute"] {
        display: none !important;
        opacity: 0 !important;
      }
      
      /* Ensure the body fits the screen and is transparent */
      body, html {
        background-color: transparent !important;
        background: none !important;
        margin: 0;
        padding: 0;
        overflow: hidden;
        width: 100%;
        height: 100%;
      }
      
      canvas {
        display: block;
        outline: none;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
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

  // 1. Inject Transparency styles
  newHtml = hideBodyText(newHtml);

  // 2. Force WebGLRenderer alpha
  newHtml = newHtml.replace(
    /new\s+THREE\.WebGLRenderer\s*\(\s*\{/g, 
    'new THREE.WebGLRenderer({ alpha: true, '
  );
  
  // Handle empty constructor
  if (!newHtml.includes('alpha: true')) {
      newHtml = newHtml.replace(
          /new\s+THREE\.WebGLRenderer\s*\(\s*\)/g, 
          'new THREE.WebGLRenderer({ alpha: true, antialias: true })'
      );
  }

  // 3. Remove scene.background assignments to ensure transparency passes through
  newHtml = newHtml.replace(/scene\.background\s*=\s*[^;]+;/g, '// scene.background removed;');
  newHtml = newHtml.replace(/scene\.fog\s*=\s*[^;]+;/g, '// scene.fog removed;'); // Fog can sometimes occlude transparency
  
  // 4. Force clear color
  newHtml = newHtml.replace(/renderer\.setClearColor\([^)]+\);?/g, 'renderer.setClearColor( 0x000000, 0 );');

  return newHtml;
};

/**
 * Three.js scenes are often too zoomed out
 */
export const zoomCamera = (html: string, zoomFactor: number = 0.8): string => {
  const regex = /camera\.position\.set\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/g;

  return html.replace(regex, (match, x, y, z) => {
    const newX = parseFloat(x) * zoomFactor;
    const newY = parseFloat(y) * zoomFactor;
    const newZ = parseFloat(z) * zoomFactor;
    return `camera.position.set(${newX}, ${newY}, ${newZ})`;
  });
};
