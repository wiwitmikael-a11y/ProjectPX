
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Extracts a complete HTML document from a string.
 */
export const extractHtmlFromText = (text: string): string => {
  if (!text) return "";
  const htmlMatch = text.match(/(?:<!DOCTYPE\s+html>|<html[\s\S]*?>)[\s\S]*?<\/html>/i);
  if (htmlMatch) return htmlMatch[0];
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1].includes('<')) return codeBlockMatch[1].trim();
  if (text.includes("<!DOCTYPE html>")) return text.substring(text.indexOf("<!DOCTYPE html>"));
  return text.trim();
};

/**
 * SAFE MODE: Previous versions broke the renderer. 
 * Now acts as a pass-through because gemini.ts handles the CSS correctly.
 */
export const hideBodyText = (html: string): string => {
  // We trust the generator to do the right thing now to avoid breaking the canvas
  return html; 
};

export const makeBackgroundTransparent = (html: string): string => {
  // We trust the generator to do the right thing now.
  return html;
};

export const zoomCamera = (html: string, zoomFactor: number = 0.8): string => {
  const regex = /camera\.position\.set\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/g;
  return html.replace(regex, (match, x, y, z) => {
    const newX = parseFloat(x) * zoomFactor;
    const newY = parseFloat(y) * zoomFactor;
    const newZ = parseFloat(z) * zoomFactor;
    return `camera.position.set(${newX}, ${newY}, ${newZ})`;
  });
};
