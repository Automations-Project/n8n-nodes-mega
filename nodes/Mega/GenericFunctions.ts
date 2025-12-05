/**
 * Generic helper functions for Mega S4 (S3-compatible) API operations
 * Uses aws4 for AWS Signature V4 signing and xml2js for XML parsing
 * No external AWS SDK dependencies (n8n Cloud compatible)
 */

import {
	IExecuteFunctions,
	IDataObject,
	NodeApiError,
	NodeOperationError,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { IMegaCredentials } from './interfaces';
import { sign } from 'aws4';
import { parseStringPromise, Builder } from 'xml2js';
import { createHash, createHmac } from 'crypto';

// ============================================================================
// Endpoint Configuration
// ============================================================================

/**
 * Get region-specific S3 endpoint for Mega S4
 */
export function getS3Endpoint(region: string): string {
	const endpointMap: Record<string, string> = {
		'eu-central-1': 's3.eu-central-1.s4.mega.io',
		'eu-central-2': 's3.eu-central-2.s4.mega.io',
		'ca-central-1': 's3.ca-central-1.s4.mega.io',
		'ca-west-1': 's3.ca-west-1.s4.mega.io',
	};

	return endpointMap[region] || endpointMap['eu-central-1'];
}

/**
 * Get region-specific IAM endpoint for Mega S4
 */
export function getIAMEndpoint(region: string): string {
	const endpointMap: Record<string, string> = {
		'eu-central-1': 'iam.eu-central-1.s4.mega.io',
		'eu-central-2': 'iam.eu-central-2.s4.mega.io',
		'ca-central-1': 'iam.ca-central-1.s4.mega.io',
		'ca-west-1': 'iam.ca-west-1.s4.mega.io',
	};

	return endpointMap[region] || endpointMap['eu-central-1'];
}

// ============================================================================
// Credential Helpers
// ============================================================================

/**
 * Get and validate Mega S4 credentials
 */
export async function getMegaCredentials(
	context: IExecuteFunctions,
	itemIndex: number = 0,
): Promise<IMegaCredentials> {
	const credentials = (await context.getCredentials('megaApi', itemIndex)) as IMegaCredentials;

	if (!credentials.accessKeyId || !credentials.secretAccessKey) {
		throw new NodeOperationError(
			context.getNode(),
			'Mega S4 credentials are required. Please configure Access Key ID and Secret Access Key.',
			{ itemIndex },
		);
	}

	return {
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey,
		region: credentials.region || 'eu-central-1',
		customEndpoint: credentials.customEndpoint,
		forcePathStyle: credentials.forcePathStyle ?? true,
	};
}

// ============================================================================
// S3 API Request Functions
// ============================================================================

export interface IS3RequestOptions {
	method: IHttpRequestMethods;
	path: string;
	bucket?: string;
	key?: string;
	query?: Record<string, string>;
	headers?: Record<string, string>;
	body?: string | Buffer;
	returnFullResponse?: boolean;
}

/**
 * Make a signed S3 API request
 */
export async function s3ApiRequest(
	this: IExecuteFunctions,
	options: IS3RequestOptions,
	itemIndex: number = 0,
): Promise<any> {
	const credentials = await getMegaCredentials(this, itemIndex);
	const endpoint = credentials.customEndpoint || getS3Endpoint(credentials.region);

	// Build the path with bucket and key
	let path = '/';
	if (options.bucket) {
		path = `/${options.bucket}`;
		if (options.key) {
			// URL encode the key, but preserve forward slashes
			const encodedKey = options.key
				.split('/')
				.map((segment) => encodeURIComponent(segment))
				.join('/');
			path = `${path}/${encodedKey}`;
		}
	}

	// Build query string
	let queryString = '';
	if (options.query && Object.keys(options.query).length > 0) {
		const params = new URLSearchParams();
		// Sort query parameters for consistent signing
		const sortedKeys = Object.keys(options.query).sort();
		for (const key of sortedKeys) {
			const value = options.query[key];
			if (value !== undefined && value !== '') {
				params.append(key, value);
			} else if (value === '') {
				// For empty value params like ?acl, ?policy, etc.
				params.append(key, '');
			}
		}
		queryString = params.toString();
	}

	const fullPath = queryString ? `${path}?${queryString}` : path;

	// Prepare headers
	const headers: Record<string, string> = {
		...options.headers,
	};

	// Add content headers for body
	if (options.body) {
		if (Buffer.isBuffer(options.body)) {
			headers['Content-Length'] = String(options.body.length);
		} else if (typeof options.body === 'string') {
			headers['Content-Length'] = String(Buffer.byteLength(options.body, 'utf8'));
		}
	}

	// Sign the request using aws4
	const signedRequest = sign(
		{
			host: endpoint,
			path: fullPath,
			method: options.method,
			service: 's3',
			region: credentials.region,
			headers,
			body: options.body,
		},
		{
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
	);

	// Build the full URL
	const url = `https://${endpoint}${fullPath}`;

	// Make the HTTP request
	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url,
		headers: signedRequest.headers as Record<string, string>,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		encoding: 'arraybuffer', // Handle binary data
	};

	if (options.body) {
		requestOptions.body = options.body;
	}

	try {
		const response = await this.helpers.httpRequest(requestOptions);

		// Handle error responses
		if (response.statusCode >= 400) {
			const errorBody = Buffer.isBuffer(response.body)
				? response.body.toString('utf8')
				: String(response.body);
			
			let errorInfo: { code: string; message: string } = {
				code: 'UnknownError',
				message: errorBody || `HTTP ${response.statusCode}`,
			};

			// Try to parse XML error
			if (errorBody && errorBody.includes('<Error>')) {
				try {
					const parsed = await parseXmlResponse(errorBody);
					if (parsed.Error) {
						errorInfo = {
							code: parsed.Error.Code || 'UnknownError',
							message: parsed.Error.Message || errorBody,
						};
					}
				} catch {
					// Keep default error info
				}
			}

			throw new NodeApiError(
				this.getNode(),
				{ message: errorInfo.message } as JsonObject,
				{
					message: `S3 API Error (${errorInfo.code}): ${errorInfo.message}`,
					httpCode: String(response.statusCode),
					itemIndex,
				},
			);
		}

		// Return based on returnFullResponse option
		if (options.returnFullResponse) {
			return response;
		}

		// Parse response body
		const body = Buffer.isBuffer(response.body)
			? response.body.toString('utf8')
			: String(response.body || '');

		// If body looks like XML, parse it
		if (body && body.trim().startsWith('<?xml') || body.trim().startsWith('<')) {
			return await parseXmlResponse(body);
		}

		return body;
	} catch (error: any) {
		if (error instanceof NodeApiError) {
			throw error;
		}

		throw new NodeOperationError(
			this.getNode(),
			`Mega S4 operation failed: ${error.message}`,
			{
				itemIndex,
				description: error.stack,
			},
		);
	}
}

/**
 * Make a signed S3 API request and return raw response (for binary data)
 */
export async function s3ApiRequestRaw(
	this: IExecuteFunctions,
	options: IS3RequestOptions,
	itemIndex: number = 0,
): Promise<{ body: Buffer; headers: Record<string, string>; statusCode: number }> {
	const response = await s3ApiRequest.call(
		this,
		{ ...options, returnFullResponse: true },
		itemIndex,
	);

	return {
		body: Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body || ''),
		headers: response.headers || {},
		statusCode: response.statusCode,
	};
}

// ============================================================================
// IAM API Request Functions
// ============================================================================

export interface IIAMRequestOptions {
	action: string;
	params?: Record<string, string>;
	version?: string;
}

/**
 * Make a signed IAM API request
 */
export async function iamApiRequest(
	this: IExecuteFunctions,
	options: IIAMRequestOptions,
	itemIndex: number = 0,
): Promise<any> {
	const credentials = await getMegaCredentials(this, itemIndex);
	const endpoint = getIAMEndpoint(credentials.region);

	// Build form data
	const formParams = new URLSearchParams();
	formParams.append('Action', options.action);
	formParams.append('Version', options.version || '2010-05-08');

	if (options.params) {
		for (const [key, value] of Object.entries(options.params)) {
			if (value !== undefined) {
				formParams.append(key, value);
			}
		}
	}

	const body = formParams.toString();

	// Prepare headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
		'Content-Length': String(Buffer.byteLength(body, 'utf8')),
	};

	// Sign the request using aws4
	const signedRequest = sign(
		{
			host: endpoint,
			path: '/',
			method: 'POST',
			service: 'iam',
			region: credentials.region,
			headers,
			body,
		},
		{
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
	);

	// Build the full URL
	const url = `https://${endpoint}/`;

	// Make the HTTP request
	const requestOptions: IHttpRequestOptions = {
		method: 'POST',
		url,
		headers: signedRequest.headers as Record<string, string>,
		body,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	try {
		const response = await this.helpers.httpRequest(requestOptions);

		// Handle error responses
		if (response.statusCode >= 400) {
			const errorBody = typeof response.body === 'string' ? response.body : String(response.body || '');
			
			let errorInfo: { code: string; message: string } = {
				code: 'UnknownError',
				message: errorBody || `HTTP ${response.statusCode}`,
			};

			// Try to parse XML error
			if (errorBody && errorBody.includes('<Error>')) {
				try {
					const parsed = await parseXmlResponse(errorBody);
					if (parsed.ErrorResponse?.Error) {
						errorInfo = {
							code: parsed.ErrorResponse.Error.Code || 'UnknownError',
							message: parsed.ErrorResponse.Error.Message || errorBody,
						};
					}
				} catch {
					// Keep default error info
				}
			}

			throw new NodeApiError(
				this.getNode(),
				{ message: errorInfo.message } as JsonObject,
				{
					message: `IAM API Error (${errorInfo.code}): ${errorInfo.message}`,
					httpCode: String(response.statusCode),
					itemIndex,
				},
			);
		}

		// Parse XML response
		const body_str = typeof response.body === 'string' ? response.body : String(response.body || '');
		return await parseXmlResponse(body_str);
	} catch (error: any) {
		if (error instanceof NodeApiError) {
			throw error;
		}

		throw new NodeOperationError(
			this.getNode(),
			`Mega S4 IAM operation failed: ${error.message}`,
			{
				itemIndex,
				description: error.stack,
			},
		);
	}
}

// ============================================================================
// XML Parsing Functions
// ============================================================================

/**
 * Parse XML response to JavaScript object
 */
export async function parseXmlResponse(xml: string): Promise<any> {
	if (!xml || xml.trim() === '') {
		return {};
	}

	try {
		const result = await parseStringPromise(xml, {
			explicitArray: false,
			ignoreAttrs: true,
			tagNameProcessors: [(name: string) => name],
		});
		return result;
	} catch (error: any) {
		throw new Error(`Failed to parse XML response: ${error.message}`);
	}
}

/**
 * Build XML from JavaScript object
 */
export function buildXml(obj: any, rootName: string = 'root'): string {
	const builder = new Builder({
		rootName,
		headless: false,
		renderOpts: { pretty: false },
	});
	return builder.buildObject(obj);
}

// ============================================================================
// Presigned URL Generation
// ============================================================================

/**
 * Generate a presigned URL for S3 operations
 */
export async function generatePresignedUrl(
	this: IExecuteFunctions,
	options: {
		bucket: string;
		key: string;
		method: 'GET' | 'PUT';
		expiresIn: number; // seconds
		contentType?: string;
	},
	itemIndex: number = 0,
): Promise<string> {
	const credentials = await getMegaCredentials(this, itemIndex);
	const endpoint = credentials.customEndpoint || getS3Endpoint(credentials.region);
	const region = credentials.region;

	// URL encode the key, preserving forward slashes
	const encodedKey = options.key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');

	const path = `/${options.bucket}/${encodedKey}`;

	// Get current timestamp
	const now = new Date();
	const amzDate = now.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
	const dateStamp = amzDate.substring(0, 8);

	// Build credential scope
	const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
	const credential = `${credentials.accessKeyId}/${credentialScope}`;

	// Build signed headers
	const signedHeaders = 'host';

	// Build canonical query string
	const queryParams: Record<string, string> = {
		'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
		'X-Amz-Credential': credential,
		'X-Amz-Date': amzDate,
		'X-Amz-Expires': String(options.expiresIn),
		'X-Amz-SignedHeaders': signedHeaders,
	};

	if (options.method === 'PUT' && options.contentType) {
		queryParams['Content-Type'] = options.contentType;
	}

	// Sort and encode query parameters
	const sortedKeys = Object.keys(queryParams).sort();
	const canonicalQueryString = sortedKeys
		.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
		.join('&');

	// Build canonical request
	const canonicalHeaders = `host:${endpoint}\n`;
	const payloadHash = 'UNSIGNED-PAYLOAD';

	const canonicalRequest = [
		options.method,
		path,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join('\n');

	// Build string to sign
	const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex');
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		canonicalRequestHash,
	].join('\n');

	// Calculate signature
	const signingKey = getSignatureKey(
		credentials.secretAccessKey,
		dateStamp,
		region,
		's3',
	);
	const signature = createHmac('sha256', signingKey)
		.update(stringToSign)
		.digest('hex');

	// Build final URL
	const presignedUrl = `https://${endpoint}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

	return presignedUrl;
}

/**
 * Generate AWS4 signing key
 */
function getSignatureKey(
	secretKey: string,
	dateStamp: string,
	regionName: string,
	serviceName: string,
): Buffer {
	const kDate = createHmac('sha256', `AWS4${secretKey}`)
		.update(dateStamp)
		.digest();
	const kRegion = createHmac('sha256', kDate).update(regionName).digest();
	const kService = createHmac('sha256', kRegion).update(serviceName).digest();
	const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
	return kSigning;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate bucket name according to S3/S4 rules
 */
export function validateBucketName(bucketName: string): { valid: boolean; error?: string } {
	if (!bucketName || bucketName.length === 0) {
		return { valid: false, error: 'Bucket name cannot be empty' };
	}

	if (bucketName.length < 3 || bucketName.length > 63) {
		return {
			valid: false,
			error: 'Bucket name must be between 3 and 63 characters long',
		};
	}

	// Check for valid characters and structure
	const bucketNameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
	if (!bucketNameRegex.test(bucketName)) {
		return {
			valid: false,
			error:
				'Bucket name can only contain lowercase letters, numbers, hyphens, and dots. Must start and end with a letter or number.',
		};
	}

	// Check for IP address format (not allowed)
	const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipRegex.test(bucketName)) {
		return { valid: false, error: 'Bucket name cannot be formatted as an IP address' };
	}

	return { valid: true };
}

/**
 * Validate object key according to S3/S4 rules
 */
export function validateObjectKey(key: string): { valid: boolean; error?: string } {
	if (!key || key.length === 0) {
		return { valid: false, error: 'Object key cannot be empty' };
	}

	if (key.length > 1024) {
		return { valid: false, error: 'Object key cannot exceed 1024 characters' };
	}

	// S3 allows most UTF-8 characters, but some are problematic
	// We'll do basic validation here
	if (key.includes('//')) {
		return {
			valid: false,
			error: 'Object key cannot contain consecutive slashes (//)',
		};
	}

	return { valid: true };
}

/**
 * Validate IAM Policy ARN format
 */
export function validatePolicyArn(arn: string): { valid: boolean; error?: string } {
	if (!arn || arn.length === 0) {
		return { valid: false, error: 'Policy ARN cannot be empty' };
	}

	// AWS IAM Policy ARN format: arn:aws:iam::account-id:policy/policy-name
	// May also support: arn:aws:iam::aws:policy/PolicyName (AWS managed policies)
	const arnPattern = /^arn:aws:iam::(\d{12}|aws):policy\/[\w+=,.@-]+(\/[\w+=,.@-]+)*$/;

	if (!arnPattern.test(arn)) {
		return {
			valid: false,
			error:
				'Invalid Policy ARN format. Expected: arn:aws:iam::account-id:policy/policy-name',
		};
	}

	return { valid: true };
}

/**
 * Validate IAM User or Group name
 */
export function validateIAMName(
	name: string,
	type: 'user' | 'group',
): { valid: boolean; error?: string } {
	if (!name || name.length === 0) {
		return { valid: false, error: `${type} name cannot be empty` };
	}

	if (name.length < 1 || name.length > 128) {
		return {
			valid: false,
			error: `${type} name must be between 1 and 128 characters long`,
		};
	}

	// IAM names can contain: alphanumeric, plus (+), equals (=), comma (,), period (.), at (@), underscore (_), hyphen (-)
	const namePattern = /^[\w+=,.@-]+$/;
	if (!namePattern.test(name)) {
		return {
			valid: false,
			error: `Invalid ${type} name format. Allowed characters: alphanumeric, plus (+), equals (=), comma (,), period (.), at (@), underscore (_), hyphen (-)`,
		};
	}

	return { valid: true };
}

// ============================================================================
// Validation Assertion Helpers (throw on invalid)
// ============================================================================

/**
 * Assert bucket name is valid, throw NodeOperationError if not
 */
export function assertBucketName(
	context: IExecuteFunctions,
	bucketName: string,
	itemIndex: number,
	prefix: string = '',
): void {
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		const label = prefix ? `${prefix} bucket name` : 'bucket name';
		throw new NodeOperationError(
			context.getNode(),
			`Invalid ${label}: ${validation.error}`,
			{ itemIndex },
		);
	}
}

/**
 * Assert object key is valid, throw NodeOperationError if not
 */
export function assertObjectKey(
	context: IExecuteFunctions,
	key: string,
	itemIndex: number,
	prefix: string = '',
): void {
	const validation = validateObjectKey(key);
	if (!validation.valid) {
		const label = prefix ? `${prefix} object key` : 'object key';
		throw new NodeOperationError(
			context.getNode(),
			`Invalid ${label}: ${validation.error}`,
			{ itemIndex },
		);
	}
}

/**
 * Assert IAM name is valid, throw NodeOperationError if not
 */
export function assertIAMName(
	context: IExecuteFunctions,
	name: string,
	type: 'user' | 'group',
	itemIndex: number,
): void {
	const validation = validateIAMName(name, type);
	if (!validation.valid) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid IAM ${type} name: ${validation.error}`,
			{ itemIndex },
		);
	}
}

/**
 * Assert policy ARN is valid, throw NodeOperationError if not
 */
export function assertPolicyArn(
	context: IExecuteFunctions,
	arn: string,
	itemIndex: number,
): void {
	const validation = validatePolicyArn(arn);
	if (!validation.valid) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid policy ARN: ${validation.error}`,
			{ itemIndex },
		);
	}
}

// ============================================================================
// Binary Data Helpers
// ============================================================================

/**
 * Convert n8n binary data to Buffer for S3 upload
 */
export async function getBinaryDataBuffer(
	this: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string = 'data',
): Promise<{ buffer: Buffer; mimeType?: string; fileName?: string }> {
	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	return {
		buffer,
		mimeType: binaryData.mimeType,
		fileName: binaryData.fileName,
	};
}

/**
 * Convert AWS SDK stream to Buffer
 */
export async function streamToBuffer(stream: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Uint8Array[] = [];
		stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks)));
	});
}

/**
 * Parse S3 error response
 */
export function parseS3Error(error: any): {
	code: string;
	message: string;
	statusCode?: number;
} {
	let code = 'UnknownError';
	let message = 'An unknown error occurred';
	let statusCode: number | undefined;

	if (error.$metadata) {
		// AWS SDK v3 error
		statusCode = error.$metadata.httpStatusCode;
		code = error.Code || error.name || code;
		message = error.message || message;
	} else if (error.code) {
		// Generic error with code
		code = error.code;
		message = error.message || message;
	}

	return { code, message, statusCode };
}

/**
 * Build pagination parameters for list operations
 */
export function buildPaginationParams(
	returnAll: boolean,
	limit?: number,
	continuationToken?: string,
): { MaxKeys?: number; ContinuationToken?: string } {
	const params: { MaxKeys?: number; ContinuationToken?: string } = {};

	if (!returnAll && limit) {
		params.MaxKeys = limit;
	}

	if (continuationToken) {
		params.ContinuationToken = continuationToken;
	}

	return params;
}

/**
 * Extract metadata from node parameters
 */
export function extractMetadata(additionalFields: IDataObject): Record<string, string> | undefined {
	if (additionalFields.metadata) {
		try {
			const metadata = additionalFields.metadata as IDataObject;
			const metadataObj: Record<string, string> = {};

			for (const [key, value] of Object.entries(metadata)) {
				metadataObj[key] = String(value);
			}

			return metadataObj;
		} catch (error) {
			return undefined;
		}
	}

	return undefined;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
