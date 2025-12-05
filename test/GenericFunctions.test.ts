/**
 * Unit tests for GenericFunctions validation helpers and utilities
 */

import {
	validateBucketName,
	validateObjectKey,
	validatePolicyArn,
	validateIAMName,
	formatBytes,
	getS3Endpoint,
	getIAMEndpoint,
	parseXmlResponse,
	buildXml,
	parseS3Error,
	buildPaginationParams,
	extractMetadata,
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

	describe('getS3Endpoint', () => {
		it('should return correct endpoint for eu-central-1', () => {
			expect(getS3Endpoint('eu-central-1')).toBe('s3.eu-central-1.s4.mega.io');
		});

		it('should return correct endpoint for eu-central-2', () => {
			expect(getS3Endpoint('eu-central-2')).toBe('s3.eu-central-2.s4.mega.io');
		});

		it('should return correct endpoint for ca-central-1', () => {
			expect(getS3Endpoint('ca-central-1')).toBe('s3.ca-central-1.s4.mega.io');
		});

		it('should return correct endpoint for ca-west-1', () => {
			expect(getS3Endpoint('ca-west-1')).toBe('s3.ca-west-1.s4.mega.io');
		});

		it('should return default endpoint for unknown region', () => {
			expect(getS3Endpoint('unknown-region')).toBe('s3.eu-central-1.s4.mega.io');
		});
	});

	describe('getIAMEndpoint', () => {
		it('should return correct endpoint for eu-central-1', () => {
			expect(getIAMEndpoint('eu-central-1')).toBe('iam.eu-central-1.s4.mega.io');
		});

		it('should return correct endpoint for eu-central-2', () => {
			expect(getIAMEndpoint('eu-central-2')).toBe('iam.eu-central-2.s4.mega.io');
		});

		it('should return correct endpoint for ca-central-1', () => {
			expect(getIAMEndpoint('ca-central-1')).toBe('iam.ca-central-1.s4.mega.io');
		});

		it('should return correct endpoint for ca-west-1', () => {
			expect(getIAMEndpoint('ca-west-1')).toBe('iam.ca-west-1.s4.mega.io');
		});

		it('should return default endpoint for unknown region', () => {
			expect(getIAMEndpoint('unknown-region')).toBe('iam.eu-central-1.s4.mega.io');
		});
	});

	describe('parseXmlResponse', () => {
		it('should return empty object for empty string', async () => {
			expect(await parseXmlResponse('')).toEqual({});
		});

		it('should return empty object for whitespace-only string', async () => {
			expect(await parseXmlResponse('   ')).toEqual({});
		});

		it('should parse simple XML', async () => {
			const xml = '<Root><Name>test</Name><Value>123</Value></Root>';
			const result = await parseXmlResponse(xml);
			expect(result.Root.Name).toBe('test');
			expect(result.Root.Value).toBe('123');
		});

		it('should parse nested XML', async () => {
			const xml = '<Root><Parent><Child>value</Child></Parent></Root>';
			const result = await parseXmlResponse(xml);
			expect(result.Root.Parent.Child).toBe('value');
		});

		it('should parse S3 ListBuckets response', async () => {
			const xml = `<?xml version="1.0" encoding="UTF-8"?>
				<ListAllMyBucketsResult>
					<Owner><ID>123</ID><DisplayName>user</DisplayName></Owner>
					<Buckets>
						<Bucket><Name>bucket1</Name><CreationDate>2024-01-01</CreationDate></Bucket>
					</Buckets>
				</ListAllMyBucketsResult>`;
			const result = await parseXmlResponse(xml);
			expect(result.ListAllMyBucketsResult.Owner.ID).toBe('123');
			expect(result.ListAllMyBucketsResult.Buckets.Bucket.Name).toBe('bucket1');
		});

		it('should handle malformed XML gracefully', async () => {
			// Native XML parser is lenient - returns unparseable content as-is
			const result = await parseXmlResponse('<invalid>');
			expect(result).toBe('<invalid>');
		});
	});

	describe('buildXml', () => {
		it('should build simple XML', () => {
			const obj = { Name: 'test' };
			const xml = buildXml(obj, 'Root');
			expect(xml).toContain('<Root>');
			expect(xml).toContain('<Name>test</Name>');
			expect(xml).toContain('</Root>');
		});

		it('should build nested XML', () => {
			const obj = { Parent: { Child: 'value' } };
			const xml = buildXml(obj, 'Root');
			expect(xml).toContain('<Parent>');
			expect(xml).toContain('<Child>value</Child>');
		});

		it('should build XML with arrays', () => {
			const obj = { Items: { Item: ['a', 'b', 'c'] } };
			const xml = buildXml(obj, 'Root');
			expect(xml).toContain('<Item>a</Item>');
			expect(xml).toContain('<Item>b</Item>');
			expect(xml).toContain('<Item>c</Item>');
		});
	});

	describe('parseS3Error', () => {
		it('should parse AWS SDK v3 error', () => {
			const error = {
				$metadata: { httpStatusCode: 404 },
				Code: 'NoSuchBucket',
				message: 'The bucket does not exist',
			};
			const result = parseS3Error(error);
			expect(result.code).toBe('NoSuchBucket');
			expect(result.message).toBe('The bucket does not exist');
			expect(result.statusCode).toBe(404);
		});

		it('should parse error with name instead of Code', () => {
			const error = {
				$metadata: { httpStatusCode: 403 },
				name: 'AccessDenied',
				message: 'Access denied',
			};
			const result = parseS3Error(error);
			expect(result.code).toBe('AccessDenied');
			expect(result.statusCode).toBe(403);
		});

		it('should parse generic error with code', () => {
			const error = {
				code: 'NetworkError',
				message: 'Network failure',
			};
			const result = parseS3Error(error);
			expect(result.code).toBe('NetworkError');
			expect(result.message).toBe('Network failure');
			expect(result.statusCode).toBeUndefined();
		});

		it('should handle unknown error format', () => {
			const error = {};
			const result = parseS3Error(error);
			expect(result.code).toBe('UnknownError');
			expect(result.message).toBe('An unknown error occurred');
		});
	});

	describe('buildPaginationParams', () => {
		it('should return empty object when returnAll is true', () => {
			const result = buildPaginationParams(true);
			expect(result).toEqual({});
		});

		it('should include MaxKeys when returnAll is false and limit provided', () => {
			const result = buildPaginationParams(false, 50);
			expect(result.MaxKeys).toBe(50);
		});

		it('should include ContinuationToken when provided', () => {
			const result = buildPaginationParams(true, undefined, 'token123');
			expect(result.ContinuationToken).toBe('token123');
		});

		it('should include both MaxKeys and ContinuationToken', () => {
			const result = buildPaginationParams(false, 100, 'nextToken');
			expect(result.MaxKeys).toBe(100);
			expect(result.ContinuationToken).toBe('nextToken');
		});

		it('should not include MaxKeys when limit is undefined', () => {
			const result = buildPaginationParams(false);
			expect(result.MaxKeys).toBeUndefined();
		});
	});

	describe('extractMetadata', () => {
		it('should return undefined when no metadata', () => {
			const result = extractMetadata({});
			expect(result).toBeUndefined();
		});

		it('should extract metadata object', () => {
			const result = extractMetadata({
				metadata: { key1: 'value1', key2: 'value2' },
			});
			expect(result).toEqual({ key1: 'value1', key2: 'value2' });
		});

		it('should convert non-string values to strings', () => {
			const result = extractMetadata({
				metadata: { count: 42, enabled: true },
			});
			expect(result).toEqual({ count: '42', enabled: 'true' });
		});

		it('should handle empty metadata object', () => {
			const result = extractMetadata({ metadata: {} });
			expect(result).toEqual({});
		});
	});
});
