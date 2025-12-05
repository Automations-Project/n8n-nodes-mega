/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/test'],
	testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			tsconfig: {
				...require('./tsconfig.json').compilerOptions,
				esModuleInterop: true,
			},
		}],
	},
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'credentials/**/*.ts',
		'!nodes/**/*.node.ts', // Exclude main node files from coverage (integration tested)
		'!**/*.d.ts',
		'!**/node_modules/**',
		'!**/dist/**',
	],
	coverageThreshold: {
		global: {
			// Updated after adding comprehensive tests for utility functions
			// Remaining uncovered: HTTP request functions, assertion helpers (require mocking)
			branches: 28,
			functions: 40,
			lines: 40,
			statements: 40,
		},
	},
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	verbose: true,
};
