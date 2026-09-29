/** Runtime environment flags exposed by Anki clients. */
export const isAnkiPC = typeof globalThis.pycmd !== 'undefined';
export const isAnkiWeb = typeof globalThis.study !== 'undefined';
export const isAnkiDroid = typeof globalThis.AnkiDroidJS !== 'undefined';
