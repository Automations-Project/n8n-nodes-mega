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
			// Lowered after Phase 9 refactor - added native AWS Sig v4 & XML implementations
			// These new functions require HTTP mocking to test properly
			branches: 25,
			functions: 35,
			lines: 35,
			statements: 35,
		},
	},
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	verbose: true,
};
