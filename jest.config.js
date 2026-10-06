module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/src/**/*.test.ts'],
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../../shared/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {tsconfig: {types: ['jest']}}],
    },
};
