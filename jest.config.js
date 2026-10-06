module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../../shared/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {tsconfig: {types: ['jest']}}],
    },
};
