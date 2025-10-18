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
			// TODO: Increase to 80% as more tests are added
			// Current baseline established with GenericFunctions validation tests
			branches: 30,
			functions: 25,
			lines: 44,
			statements: 43,
		},
	},
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	verbose: true,
};
