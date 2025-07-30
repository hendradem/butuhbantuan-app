import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    dir: './', // root of Next.js app
})

const customJestConfig = {
    setupFilesAfterEnv: ['./jest.setup.ts'],
    testMatch: [
        '<rootDir>/app/**/*.(spec|test).[jt]s?(x)',
        '<rootDir>/app/**/__test__/**/*.(spec|test).[jt]s?(x)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/app/store/api'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1', // adjust if using @ alias
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/store/(.*)$': '<rootDir>/app/store/$1',
        '^.+\\.(css|scss|sass)$': 'identity-obj-proxy',
    },
    testEnvironment: 'jest-environment-jsdom',
    moduleDirectories: ['node_modules', '<rootDir>/'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/app/store/api/',
        '/app/config/',
        '/app/hooks/',
        '/app/service-worker/',
        '/.next/',
        'jest.config.ts',
        'layout.tsx',
        '/app/manifest.ts',
        '/app/utils/geocoding.ts',
        '/app/utils/getCurrentLocation.ts',
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    // coverageReporters: ['text', 'html', 'lcov'],
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/node_modules/**',
        '!**/__test__/**',
        '!**/*.d.ts',
        '!**/test-utils/**',
    ],
}

export default createJestConfig(customJestConfig)
