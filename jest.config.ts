import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  // Coverage targets the layers that hold logic; controllers and Knex
  // repositories are exercised by the e2e suite instead.
  collectCoverageFrom: [
    'src/common/**/*.ts',
    'src/modules/*/application/**/*.ts',
    'src/modules/*/domain/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/testing/**',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};

export default config;
