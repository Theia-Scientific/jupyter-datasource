// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

import { TextDecoder, TextEncoder } from 'util';

/**
 * Logger
 */
jest.mock('@theia/utils/logger');
jest.mock('react-syntax-highlighter');
jest.mock('react-markdown');

/**
 * Assign Text Decoder and Encoder which are required in @grafana/ui
 */
Object.assign(global, { TextDecoder, TextEncoder });

/**
 * Combobox uses the canvas API to measure text width for sizing, which jsdom does not implement
 */
window.HTMLCanvasElement.prototype.getContext = () => ({
  measureText: (text) => ({ width: text.length * 8 }),
});

/**
 * Combobox uses IntersectionObserver internally, which jsdom does not implement
 */
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
