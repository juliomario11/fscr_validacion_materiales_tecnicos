module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '.*(\\.spec|\\.e2e-spec)\\.ts$',
  setupFiles: ['<rootDir>/test/__helpers__/test-env-setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  clearMocks: true,
};
