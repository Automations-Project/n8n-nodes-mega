/**
 * Unit tests for GenericFunctions validation helpers
 */

import {
	validateBucketName,
	validateObjectKey,
	validatePolicyArn,
	validateIAMName,
	formatBytes,
} from '../nodes/Mega/GenericFunctions';

describe('GenericFunctions', () => {
	describe('validateBucketName', () => {
		it('should validate valid bucket names', () => {
			expect(validateBucketName('my-bucket')).toEqual({ valid: true });
			expect(validateBucketName('test-bucket-123')).toEqual({ valid: true });
			expect(validateBucketName('bucket.with.dots')).toEqual({ valid: true });
		});

		it('should reject empty bucket names', () => {
			const result = validateBucketName('');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Bucket name cannot be empty');
		});

		it('should reject bucket names that are too short', () => {
			const result = validateBucketName('ab');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Bucket name must be between 3 and 63 characters long');
		});

		it('should reject bucket names that are too long', () => {
			const result = validateBucketName('a'.repeat(64));
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Bucket name must be between 3 and 63 characters long');
		});

		it('should reject bucket names with invalid characters', () => {
			const result = validateBucketName('Bucket-With-Capitals');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('lowercase letters');
		});

		it('should reject bucket names formatted as IP addresses', () => {
			const result = validateBucketName('192.168.1.1');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Bucket name cannot be formatted as an IP address');
		});

		it('should reject bucket names starting with hyphen', () => {
			const result = validateBucketName('-bucket');
			expect(result.valid).toBe(false);
		});

		it('should reject bucket names ending with hyphen', () => {
			const result = validateBucketName('bucket-');
			expect(result.valid).toBe(false);
		});
	});

	describe('validateObjectKey', () => {
		it('should validate valid object keys', () => {
			expect(validateObjectKey('file.txt')).toEqual({ valid: true });
			expect(validateObjectKey('folder/file.txt')).toEqual({ valid: true });
			expect(validateObjectKey('deep/nested/folder/file.txt')).toEqual({ valid: true });
		});

		it('should reject empty object keys', () => {
			const result = validateObjectKey('');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Object key cannot be empty');
		});

		it('should reject object keys that are too long', () => {
			const result = validateObjectKey('a'.repeat(1025));
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Object key cannot exceed 1024 characters');
		});

		it('should reject object keys with consecutive slashes', () => {
			const result = validateObjectKey('folder//file.txt');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Object key cannot contain consecutive slashes (//)');
		});
	});

	describe('validatePolicyArn', () => {
		it('should validate valid policy ARNs', () => {
			expect(validatePolicyArn('arn:aws:iam::123456789012:policy/MyPolicy')).toEqual({ valid: true });
			expect(validatePolicyArn('arn:aws:iam::aws:policy/AWSManagedPolicy')).toEqual({ valid: true });
			expect(validatePolicyArn('arn:aws:iam::123456789012:policy/path/to/MyPolicy')).toEqual({ valid: true });
		});

		it('should reject empty policy ARNs', () => {
			const result = validatePolicyArn('');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Policy ARN cannot be empty');
		});

		it('should reject invalid policy ARN format', () => {
			const result = validatePolicyArn('not-an-arn');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid Policy ARN format');
		});

		it('should reject policy ARNs without account ID', () => {
			const result = validatePolicyArn('arn:aws:iam:::policy/MyPolicy');
			expect(result.valid).toBe(false);
		});
	});

	describe('validateIAMName', () => {
		it('should validate valid IAM user names', () => {
			expect(validateIAMName('john.doe', 'user')).toEqual({ valid: true });
			expect(validateIAMName('user+tag@example.com', 'user')).toEqual({ valid: true });
			expect(validateIAMName('User_Name-123', 'user')).toEqual({ valid: true });
		});

		it('should validate valid IAM group names', () => {
			expect(validateIAMName('Admins', 'group')).toEqual({ valid: true });
			expect(validateIAMName('Dev-Team', 'group')).toEqual({ valid: true });
		});

		it('should reject empty IAM names', () => {
			const result = validateIAMName('', 'user');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('user name cannot be empty');
		});

		it('should reject IAM names that are too long', () => {
			const result = validateIAMName('a'.repeat(129), 'user');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('between 1 and 128 characters');
		});

		it('should reject IAM names with invalid characters', () => {
			const result = validateIAMName('user#name', 'user');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid');
		});
	});

	describe('formatBytes', () => {
		it('should format bytes correctly', () => {
			expect(formatBytes(0)).toBe('0 Bytes');
			expect(formatBytes(1024)).toBe('1 KB');
			expect(formatBytes(1048576)).toBe('1 MB');
			expect(formatBytes(1073741824)).toBe('1 GB');
			expect(formatBytes(1099511627776)).toBe('1 TB');
		});

		it('should handle non-exact sizes', () => {
			expect(formatBytes(1536)).toBe('1.5 KB');
			expect(formatBytes(1572864)).toBe('1.5 MB');
			expect(formatBytes(5242880)).toBe('5 MB');
		});

		it('should round to 2 decimal places', () => {
			expect(formatBytes(1234567)).toBe('1.18 MB');
			expect(formatBytes(9876543210)).toBe('9.2 GB');
		});
	});
});
