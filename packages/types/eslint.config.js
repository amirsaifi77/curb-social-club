import base from '@curb/config/eslint/base';

export default [
  ...base,
  {
    // openapi-typescript output; regenerated, never edited.
    ignores: ['src/generated.d.ts'],
  },
];
