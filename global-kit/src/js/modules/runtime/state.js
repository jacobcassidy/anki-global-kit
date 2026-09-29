/** State shared by answer input and output rendering. */
export const state = {
  outputAnswers: undefined,
  boundInputs: new WeakSet(),
  renderedPlainOutputs: new WeakSet(),
};
