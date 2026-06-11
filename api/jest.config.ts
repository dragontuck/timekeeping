import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/types/**',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 75,
            statements: 75,
        },
    },
    clearMocks: true,
    restoreMocks: true,
};

export default config;
