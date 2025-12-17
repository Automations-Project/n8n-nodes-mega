/**
 * Generic helper functions for Mega S4 (S3-compatible) API operations
 * Uses native crypto for AWS Signature V4 signing and regex-based XML parsing
 * Zero external dependencies - n8n Cloud compatible
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
import { createHash, createHmac } from 'crypto';

// ============================================================================
// Native AWS Signature V4 Implementation
// ============================================================================

interface ISignOptions {
	host: string;
	path: string;
	method: string;
	service: string;
	region: string;
	headers: Record<string, string>;
	body?: string | Buffer;
}

interface IAwsCredentials {
	accessKeyId: string;
	secretAccessKey: string;
}

interface ISignedRequest {
	headers: Record<string, string>;
}

/**
 * Format date as AWS AMZ date format (YYYYMMDDTHHMMSSZ)
 */
function formatAmzDate(date: Date): string {
	return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Calculate SHA256 hash
 */
function sha256(data: string | Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate HMAC-SHA256
 */
function hmacSha256(key: Buffer | string, data: string): Buffer {
	return createHmac('sha256', key).update(data).digest();
}

/**
 * Generate AWS4 signing key
 */
function getSigningKey(
	secretKey: string,
	dateStamp: string,
	regionName: string,
	serviceName: string,
): Buffer {
	const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
	const kRegion = hmacSha256(kDate, regionName);
	const kService = hmacSha256(kRegion, serviceName);
	const kSigning = hmacSha256(kService, 'aws4_request');
	return kSigning;
}

/**
 * URI encode a string according to AWS requirements
 */
function uriEncode(str: string, encodeSlash: boolean = true): string {
	let encoded = '';
	for (const char of str) {
		if (
			(char >= 'A' && char <= 'Z') ||
			(char >= 'a' && char <= 'z') ||
			(char >= '0' && char <= '9') ||
			char === '_' ||
			char === '-' ||
			char === '~' ||
			char === '.'
		) {
			encoded += char;
		} else if (char === '/' && !encodeSlash) {
			encoded += char;
		} else {
			encoded += '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
		}
	}
	return encoded;
}

/**
 * Sign an AWS request using Signature Version 4
 * Native implementation without aws4 dependency
 */
function signAwsRequest(options: ISignOptions, credentials: IAwsCredentials): ISignedRequest {
	const now = new Date();
	const amzDate = formatAmzDate(now);
	const dateStamp = amzDate.substring(0, 8);

	// Prepare headers with required AWS headers
	const headers: Record<string, string> = { ...options.headers };
	headers['host'] = options.host;
	headers['x-amz-date'] = amzDate;

	// Calculate content hash
	const payloadHash = options.body ? sha256(options.body) : sha256('');
	headers['x-amz-content-sha256'] = payloadHash;

	// Build canonical headers (sorted, lowercase)
	const sortedHeaderKeys = Object.keys(headers)
		.map((k) => k.toLowerCase())
		.sort();
	const canonicalHeaders = sortedHeaderKeys
		.map((key) => `${key}:${headers[Object.keys(headers).find((k) => k.toLowerCase() === key)!].trim()}`)
		.join('\n') + '\n';
	const signedHeaders = sortedHeaderKeys.join(';');

	// Parse path and query string
	let canonicalUri = options.path;
	let canonicalQueryString = '';
	const queryIndex = options.path.indexOf('?');
	if (queryIndex !== -1) {
		canonicalUri = options.path.substring(0, queryIndex);
		const queryString = options.path.substring(queryIndex + 1);
		// Parse and sort query parameters
		const params = new URLSearchParams(queryString);
		const sortedParams: string[] = [];
		params.forEach((value, key) => {
			sortedParams.push(`${uriEncode(key)}=${uriEncode(value)}`);
		});
		sortedParams.sort();
		canonicalQueryString = sortedParams.join('&');
	}

	// Build canonical request
	const canonicalRequest = [
		options.method,
		uriEncode(canonicalUri, false),
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join('\n');

	// Build string to sign
	const credentialScope = `${dateStamp}/${options.region}/${options.service}/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		sha256(canonicalRequest),
	].join('\n');

	// Calculate signature
	const signingKey = getSigningKey(
		credentials.secretAccessKey,
		dateStamp,
		options.region,
		options.service,
	);
	const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

	// Build authorization header
	const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
	headers['authorization'] = authorization;

	// Return headers with proper casing
	const resultHeaders: Record<string, string> = {};
	for (const key of Object.keys(headers)) {
		resultHeaders[key] = headers[key];
	}

	return { headers: resultHeaders };
}

// ============================================================================
// Native XML Parsing Implementation
// ============================================================================

/**
 * Parse XML string to JavaScript object
 * Simple regex-based parser for S3/IAM XML responses
 */
function parseXmlToObject(xml: string): any {
	if (!xml || xml.trim() === '') {
		return {};
	}

	// Remove XML declaration
	xml = xml.replace(/<\?xml[^?]*\?>/g, '').trim();

	// Parse XML recursively
	function parseNode(str: string): any {
		const result: any = {};
		
		// Match tags and their content
		const tagRegex = /<([a-zA-Z0-9_:-]+)([^>]*)>([\s\S]*?)<\/\1>/g;
		const selfClosingRegex = /<([a-zA-Z0-9_:-]+)([^>]*)\/>/g;
		
		let match;
		let hasChildren = false;
		
		// Handle self-closing tags
		while ((match = selfClosingRegex.exec(str)) !== null) {
			hasChildren = true;
			const tagName = match[1];
			if (result[tagName] === undefined) {
				result[tagName] = '';
			} else if (!Array.isArray(result[tagName])) {
				result[tagName] = [result[tagName], ''];
			} else {
				result[tagName].push('');
			}
		}
		
		// Handle regular tags
		while ((match = tagRegex.exec(str)) !== null) {
			hasChildren = true;
			const tagName = match[1];
			const content = match[3].trim();
			
			// Check if content has nested tags
			const hasNestedTags = /<[a-zA-Z0-9_:-]+[^>]*>/.test(content);
			
			let value: any;
			if (hasNestedTags) {
				value = parseNode(content);
			} else {
				// Decode XML entities
				value = content
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&amp;/g, '&')
					.replace(/&quot;/g, '"')
					.replace(/&apos;/g, "'");
			}
			
			// Handle multiple same-named tags as array
			if (result[tagName] === undefined) {
				result[tagName] = value;
			} else if (!Array.isArray(result[tagName])) {
				result[tagName] = [result[tagName], value];
			} else {
				result[tagName].push(value);
			}
		}
		
		return hasChildren ? result : str;
	}

	return parseNode(xml);
}

/**
 * Build XML string from JavaScript object
 * Simple builder for S3 request bodies
 */
function buildXmlFromObject(obj: any, rootName: string = 'root'): string {
	function buildNode(data: any, nodeName: string): string {
		if (data === null || data === undefined) {
			return `<${nodeName}/>`;
		}
		
		if (typeof data !== 'object') {
			// Encode XML entities
			const encoded = String(data)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;');
			return `<${nodeName}>${encoded}</${nodeName}>`;
		}
		
		if (Array.isArray(data)) {
			return data.map((item) => buildNode(item, nodeName)).join('');
		}
		
		// Object - build nested tags
		let content = '';
		for (const [key, value] of Object.entries(data)) {
			if (key.startsWith('@')) continue; // Skip attributes for simplicity
			content += buildNode(value, key);
		}
		return `<${nodeName}>${content}</${nodeName}>`;
	}

	const xml = buildNode(obj, rootName);
	return `<?xml version="1.0" encoding="UTF-8"?>${xml}`;
}

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

	// Sign the request using native AWS Sig v4
	const signedRequest = signAwsRequest(
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

		// Handle 304 Not Modified - This is a valid response for conditional requests (S4 v2.14.0+)
		// Return the response as-is so handlers can process it appropriately
		if (response.statusCode === 304) {
			if (options.returnFullResponse) {
				return response;
			}
			return {
				notModified: true,
				statusCode: 304,
				message: 'Object has not been modified since the specified condition',
			};
		}

		// Handle 412 Precondition Failed - Conditional request failed (S4 v2.14.0+)
		if (response.statusCode === 412) {
			throw new NodeApiError(
				this.getNode(),
				{ message: 'Precondition failed' } as JsonObject,
				{
					message: 'S3 API Error (PreconditionFailed): The specified precondition (If-Match or If-Unmodified-Since) was not met. The object has been modified.',
					httpCode: '412',
					itemIndex,
				},
			);
		}

		// Handle other error responses
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

	// Sign the request using native AWS Sig v4
	const signedRequest = signAwsRequest(
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
		return parseXmlToObject(xml);
	} catch (error: any) {
		throw new Error(`Failed to parse XML response: ${error.message}`);
	}
}

/**
 * Build XML from JavaScript object
 */
export function buildXml(obj: any, rootName: string = 'root'): string {
	return buildXmlFromObject(obj, rootName);
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
	const signingKey = getSigningKey(
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
