/**
 * Generic helper functions for Mega S4 (S3-compatible) API operations
 * Uses AWS SDK v3 for S3-compatible operations with proper authentication
 */

import { IExecuteFunctions, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { IMegaCredentials } from './interfaces';

// AWS SDK v3 imports - these will be added to package.json
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { IAMClient, IAMClientConfig } from '@aws-sdk/client-iam';

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

/**
 * Initialize and return configured S3 client for Mega S4
 */
export async function getS3Client(
	this: IExecuteFunctions,
	itemIndex: number = 0,
): Promise<S3Client> {
	// Get credentials from n8n
	const credentials = (await this.getCredentials('megaApi', itemIndex)) as IMegaCredentials;

	if (!credentials.accessKeyId || !credentials.secretAccessKey) {
		throw new NodeOperationError(
			this.getNode(),
			'Mega S4 credentials are required. Please configure Access Key ID and Secret Access Key.',
			{ itemIndex },
		);
	}

	// Determine endpoint
	const region = credentials.region || 'eu-central-1';
	const endpoint = credentials.customEndpoint
		? `https://${credentials.customEndpoint}`
		: `https://${getS3Endpoint(region)}`;

	// Configure S3 client
	const s3Config: S3ClientConfig = {
		region: region,
		endpoint: endpoint,
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
		forcePathStyle: credentials.forcePathStyle ?? true, // Mega S4 typically requires path style
		// Optional: Add custom user agent
		// customUserAgent: 'n8n-mega-s4-node/1.0.0',
	};

	return new S3Client(s3Config);
}

/**
 * Initialize and return configured IAM client for Mega S4
 */
export async function getIAMClient(
	this: IExecuteFunctions,
	itemIndex: number = 0,
): Promise<IAMClient> {
	// Get credentials from n8n
	const credentials = (await this.getCredentials('megaApi', itemIndex)) as IMegaCredentials;

	if (!credentials.accessKeyId || !credentials.secretAccessKey) {
		throw new NodeOperationError(
			this.getNode(),
			'Mega S4 credentials are required. Please configure Access Key ID and Secret Access Key.',
			{ itemIndex },
		);
	}

	// Determine endpoint
	const region = credentials.region || 'eu-central-1';
	const endpoint = credentials.customEndpoint
		? `https://${credentials.customEndpoint}`
		: `https://${getIAMEndpoint(region)}`;

	// Configure IAM client
	const iamConfig: IAMClientConfig = {
		region: region,
		endpoint: endpoint,
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
	};

	return new IAMClient(iamConfig);
}

/**
 * Execute S3 command with proper error handling
 */
export async function executeS3Command<TInput extends object, TOutput>(
	this: IExecuteFunctions,
	command: any, // AWS SDK Command instance
	itemIndex: number = 0,
): Promise<TOutput> {
	try {
		const s3Client = await getS3Client.call(this, itemIndex);
		const response = await s3Client.send(command);
		return response as TOutput;
	} catch (error: any) {
		// Handle S3-specific errors
		if (error.$metadata) {
			// AWS SDK v3 error structure
			const statusCode = error.$metadata.httpStatusCode || 500;
			const errorCode = error.Code || error.name || 'UnknownError';
			const errorMessage = error.message || 'An unknown error occurred';

			throw new NodeApiError(this.getNode(), error, {
				message: `S3 API Error (${errorCode}): ${errorMessage}`,
				description: `Status: ${statusCode}. ${errorMessage}`,
				httpCode: String(statusCode),
				itemIndex,
			});
		}

		// Generic error
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
 * Execute IAM command with proper error handling
 */
export async function executeIAMCommand<TInput extends object, TOutput>(
	this: IExecuteFunctions,
	command: any, // AWS SDK Command instance
	itemIndex: number = 0,
): Promise<TOutput> {
	try {
		const iamClient = await getIAMClient.call(this, itemIndex);
		const response = await iamClient.send(command);
		return response as TOutput;
	} catch (error: any) {
		// Handle IAM-specific errors
		if (error.$metadata) {
			// AWS SDK v3 error structure
			const statusCode = error.$metadata.httpStatusCode || 500;
			const errorCode = error.Code || error.name || 'UnknownError';
			const errorMessage = error.message || 'An unknown error occurred';

			throw new NodeApiError(this.getNode(), error, {
				message: `IAM API Error (${errorCode}): ${errorMessage}`,
				description: `Status: ${statusCode}. ${errorMessage}`,
				httpCode: String(statusCode),
				itemIndex,
			});
		}

		// Generic error
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
