/**
 * Operation handler methods for Mega S4 node
 * Each handler implements a specific S3 operation with validation and error handling
 * Uses HTTP requests with aws4 signing - No AWS SDK dependencies
 */

import {
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import {
	s3ApiRequest,
	s3ApiRequestRaw,
	iamApiRequest,
	generatePresignedUrl,
	buildXml,
	validateBucketName,
	validateObjectKey,
	validatePolicyArn,
	validateIAMName,
	getBinaryDataBuffer,
} from './GenericFunctions';

// ============================================================================
// Bucket Operation Handlers
// ============================================================================

/**
 * List all buckets in the account
 */
export async function handleListBuckets(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', path: '/' },
		itemIndex,
	);

	// Parse the ListAllMyBucketsResult response
	const bucketsData = response?.ListAllMyBucketsResult?.Buckets?.Bucket;
	let buckets: any[] = [];
	
	if (bucketsData) {
		// Handle both single bucket and array of buckets
		buckets = Array.isArray(bucketsData) ? bucketsData : [bucketsData];
	}

	// Return each bucket as a separate item
	return buckets.map((bucket) => ({
		json: {
			name: bucket.Name,
			creationDate: bucket.CreationDate,
		},
		pairedItem: { item: itemIndex },
	}));
}

/**
 * Create a new bucket
 */
export async function handleCreateBucket(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${validation.error}`,
			{ itemIndex },
		);
	}

	await s3ApiRequest.call(
		this,
		{ method: 'PUT', bucket: bucketName, path: '' },
		itemIndex,
	);

	return {
		json: {
			success: true,
			bucketName,
			location: `/${bucketName}`,
			message: `Bucket '${bucketName}' created successfully`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Delete an empty bucket
 */
export async function handleDeleteBucket(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${validation.error}`,
			{ itemIndex },
		);
	}

	await s3ApiRequest.call(
		this,
		{ method: 'DELETE', bucket: bucketName, path: '' },
		itemIndex,
	);

	return {
		json: {
			success: true,
			bucketName,
			message: `Bucket '${bucketName}' deleted successfully`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Check if bucket exists (Head)
 */
export async function handleHeadBucket(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${validation.error}`,
			{ itemIndex },
		);
	}

	await s3ApiRequest.call(
		this,
		{ method: 'HEAD', bucket: bucketName, path: '' },
		itemIndex,
	);

	return {
		json: {
			success: true,
			bucketName,
			exists: true,
			message: `Bucket '${bucketName}' exists and is accessible`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Get bucket location (region)
 */
export async function handleGetBucketLocation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${validation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', bucket: bucketName, path: '', query: { location: '' } },
		itemIndex,
	);

	const location = response?.LocationConstraint || 'us-east-1';

	return {
		json: {
			bucketName,
			region: location,
		},
		pairedItem: { item: itemIndex },
	};
}

// ============================================================================
// Object Operation Handlers
// ============================================================================

/**
 * List objects in a bucket
 */
export async function handleListObjects(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 100) as number;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	// Validate bucket name
	const validation = validateBucketName(bucketName);
	if (!validation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${validation.error}`,
			{ itemIndex },
		);
	}

	const objects: INodeExecutionData[] = [];
	let continuationToken: string | undefined = undefined;

	do {
		const query: Record<string, string> = {
			'list-type': '2',
		};

		if (!returnAll && limit) {
			query['max-keys'] = String(limit);
		}
		if (continuationToken) {
			query['continuation-token'] = continuationToken;
		}
		if (additionalFields.prefix) {
			query['prefix'] = additionalFields.prefix as string;
		}
		if (additionalFields.delimiter) {
			query['delimiter'] = additionalFields.delimiter as string;
		}
		if (additionalFields.startAfter) {
			query['start-after'] = additionalFields.startAfter as string;
		}

		const response = await s3ApiRequest.call(
			this,
			{ method: 'GET', bucket: bucketName, path: '', query },
			itemIndex,
		);

		// Parse ListBucketResult response
		const result = response?.ListBucketResult;
		let contents = result?.Contents || [];
		
		// Handle single object vs array
		if (contents && !Array.isArray(contents)) {
			contents = [contents];
		}

		// Add each object as a separate item
		for (const obj of contents) {
			objects.push({
				json: {
					key: obj.Key,
					lastModified: obj.LastModified,
					etag: obj.ETag?.replace(/"/g, ''),
					size: obj.Size ? parseInt(obj.Size, 10) : 0,
					sizeFormatted: obj.Size ? formatBytes(parseInt(obj.Size, 10)) : '0 Bytes',
					storageClass: obj.StorageClass,
					owner: obj.Owner,
				},
				pairedItem: { item: itemIndex },
			});
		}

		// Check if we need to continue pagination
		continuationToken = result?.NextContinuationToken;

		// If not returnAll and we've reached the limit, stop
		if (!returnAll && objects.length >= limit) {
			break;
		}
	} while (continuationToken && returnAll);

	// If limit is set and not returnAll, slice to exact limit
	if (!returnAll && objects.length > limit) {
		return objects.slice(0, limit);
	}

	return objects;
}

/**
 * Upload an object (Put)
 */
export async function handlePutObject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const objectKey = this.getNodeParameter('objectKey', itemIndex) as string;
	const binaryData = this.getNodeParameter('binaryData', itemIndex, true) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	// Validate bucket and key
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(objectKey);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	let body: Buffer | string;
	let contentType: string | undefined;

	if (binaryData) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const binaryDataInfo = await getBinaryDataBuffer.call(this, itemIndex, binaryPropertyName);
		body = binaryDataInfo.buffer;
		contentType = binaryDataInfo.mimeType || (additionalFields.contentType as string);
	} else {
		body = this.getNodeParameter('textData', itemIndex) as string;
		contentType = (additionalFields.contentType as string) || 'text/plain';
	}

	// Build headers with metadata
	const headers: Record<string, string> = {};
	if (contentType) {
		headers['Content-Type'] = contentType;
	}

	// Add custom metadata headers
	if (additionalFields.metadata) {
		const metadataValues = (additionalFields.metadata as IDataObject).metadataValues as IDataObject[];
		if (metadataValues && metadataValues.length > 0) {
			for (const item of metadataValues) {
				if (item.key && item.value) {
					headers[`x-amz-meta-${item.key}`] = item.value as string;
				}
			}
		}
	}

	const response = await s3ApiRequestRaw.call(
		this,
		{
			method: 'PUT',
			bucket: bucketName,
			key: objectKey,
			path: '',
			headers,
			body,
		},
		itemIndex,
	);

	const etag = response.headers['etag']?.replace(/"/g, '');
	const versionId = response.headers['x-amz-version-id'];

	return {
		json: {
			success: true,
			bucketName,
			objectKey,
			etag,
			versionId,
			size: typeof body === 'string' ? Buffer.byteLength(body) : body.length,
			sizeFormatted: formatBytes(typeof body === 'string' ? Buffer.byteLength(body) : body.length),
			message: `Object '${objectKey}' uploaded successfully to '${bucketName}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Download an object (Get)
 */
export async function handleGetObject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const objectKey = this.getNodeParameter('objectKey', itemIndex) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;

	// Validate bucket and key
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(objectKey);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequestRaw.call(
		this,
		{ method: 'GET', bucket: bucketName, key: objectKey, path: '' },
		itemIndex,
	);

	// Extract filename from key (last part after /)
	const fileName = objectKey.split('/').pop() || objectKey;
	const contentType = response.headers['content-type'];
	const contentLength = response.headers['content-length'];
	const etag = response.headers['etag']?.replace(/"/g, '');
	const lastModified = response.headers['last-modified'];

	// Prepare binary data
	const binaryDataResult = await this.helpers.prepareBinaryData(
		response.body,
		fileName,
		contentType,
	);

	return {
		json: {
			bucketName,
			objectKey,
			fileName,
			contentType,
			size: contentLength ? parseInt(contentLength, 10) : response.body.length,
			sizeFormatted: formatBytes(contentLength ? parseInt(contentLength, 10) : response.body.length),
			etag,
			lastModified,
		},
		binary: {
			[binaryPropertyName]: binaryDataResult,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Delete a single object
 */
export async function handleDeleteObject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const objectKey = this.getNodeParameter('objectKey', itemIndex) as string;

	// Validate bucket and key
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(objectKey);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequestRaw.call(
		this,
		{ method: 'DELETE', bucket: bucketName, key: objectKey, path: '' },
		itemIndex,
	);

	const deleteMarker = response.headers['x-amz-delete-marker'] === 'true';
	const versionId = response.headers['x-amz-version-id'];

	return {
		json: {
			success: true,
			bucketName,
			objectKey,
			deleteMarker,
			versionId,
			message: `Object '${objectKey}' deleted successfully from '${bucketName}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Delete multiple objects at once
 */
export async function handleDeleteMultipleObjects(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const objectKeysString = this.getNodeParameter('objectKeys', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	// Validate bucket
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Parse object keys (comma-separated)
	const objectKeys = objectKeysString
		.split(',')
		.map((key) => key.trim())
		.filter((key) => key.length > 0);

	if (objectKeys.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'No object keys provided for deletion',
			{ itemIndex },
		);
	}

	// Validate each key
	for (const key of objectKeys) {
		const keyValidation = validateObjectKey(key);
		if (!keyValidation.valid) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid object key '${key}': ${keyValidation.error}`,
				{ itemIndex },
			);
		}
	}

	// Build the Delete XML body
	const deleteXml = buildXml(
		{
			Delete: {
				Object: objectKeys.map((key) => ({ Key: key })),
				Quiet: (additionalFields.quiet as boolean) || false,
			},
		},
		'Delete',
	);

	const response = await s3ApiRequest.call(
		this,
		{
			method: 'POST',
			bucket: bucketName,
			path: '',
			query: { delete: '' },
			headers: { 'Content-Type': 'application/xml' },
			body: deleteXml,
		},
		itemIndex,
	);

	// Parse DeleteResult response
	const result = response?.DeleteResult;
	let deleted = result?.Deleted || [];
	let errors = result?.Error || [];

	// Handle single item vs array
	if (deleted && !Array.isArray(deleted)) {
		deleted = [deleted];
	}
	if (errors && !Array.isArray(errors)) {
		errors = [errors];
	}

	return {
		json: {
			success: true,
			bucketName,
			deleted,
			errors,
			deletedCount: deleted.length,
			errorCount: errors.length,
			message: `Deleted ${deleted.length} objects from '${bucketName}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Get object metadata without downloading (Head)
 */
export async function handleHeadObject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const objectKey = this.getNodeParameter('objectKey', itemIndex) as string;

	// Validate bucket and key
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(objectKey);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequestRaw.call(
		this,
		{ method: 'HEAD', bucket: bucketName, key: objectKey, path: '' },
		itemIndex,
	);

	const contentType = response.headers['content-type'];
	const contentLength = response.headers['content-length'];
	const etag = response.headers['etag']?.replace(/"/g, '');
	const lastModified = response.headers['last-modified'];
	const versionId = response.headers['x-amz-version-id'];
	const storageClass = response.headers['x-amz-storage-class'];

	// Extract custom metadata
	const metadata: Record<string, string> = {};
	for (const [key, value] of Object.entries(response.headers)) {
		if (key.startsWith('x-amz-meta-')) {
			metadata[key.replace('x-amz-meta-', '')] = value;
		}
	}

	return {
		json: {
			bucketName,
			objectKey,
			contentType,
			size: contentLength ? parseInt(contentLength, 10) : 0,
			sizeFormatted: formatBytes(contentLength ? parseInt(contentLength, 10) : 0),
			etag,
			lastModified,
			metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
			versionId,
			storageClass,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Copy an object
 */
export async function handleCopyObject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const sourceBucket = this.getNodeParameter('sourceBucket', itemIndex) as string;
	const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;
	const destinationBucket = this.getNodeParameter('destinationBucket', itemIndex) as string;
	const destinationKey = this.getNodeParameter('destinationKey', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	// Validate buckets and keys
	const sourceBucketValidation = validateBucketName(sourceBucket);
	if (!sourceBucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid source bucket name: ${sourceBucketValidation.error}`,
			{ itemIndex },
		);
	}

	const destBucketValidation = validateBucketName(destinationBucket);
	if (!destBucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid destination bucket name: ${destBucketValidation.error}`,
			{ itemIndex },
		);
	}

	const sourceKeyValidation = validateObjectKey(sourceKey);
	if (!sourceKeyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid source key: ${sourceKeyValidation.error}`,
			{ itemIndex },
		);
	}

	const destKeyValidation = validateObjectKey(destinationKey);
	if (!destKeyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid destination key: ${destKeyValidation.error}`,
			{ itemIndex },
		);
	}

	// Build headers for copy
	const headers: Record<string, string> = {
		'x-amz-copy-source': `/${sourceBucket}/${sourceKey}`,
	};

	if (additionalFields.metadataDirective) {
		headers['x-amz-metadata-directive'] = additionalFields.metadataDirective as string;
	}

	const response = await s3ApiRequest.call(
		this,
		{
			method: 'PUT',
			bucket: destinationBucket,
			key: destinationKey,
			path: '',
			headers,
		},
		itemIndex,
	);

	// Parse CopyObjectResult response
	const result = response?.CopyObjectResult;

	return {
		json: {
			success: true,
			sourceBucket,
			sourceKey,
			destinationBucket,
			destinationKey,
			etag: result?.ETag?.replace(/"/g, ''),
			lastModified: result?.LastModified,
			message: `Object copied from '${sourceBucket}/${sourceKey}' to '${destinationBucket}/${destinationKey}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Generate a presigned URL for downloading an object
 * Operation: Object > Get Presigned URL
 */
export async function handleGetPresignedUrl(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const expiresIn = this.getNodeParameter('expiresIn', itemIndex, 3600) as number;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate object key
	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate expiration time
	if (expiresIn < 1 || expiresIn > 604800) {
		throw new NodeOperationError(
			this.getNode(),
			'Expiration time must be between 1 second and 604800 seconds (7 days)',
			{ itemIndex },
		);
	}

	const presignedUrl = await generatePresignedUrl.call(
		this,
		{
			bucket: bucketName,
			key,
			method: 'GET',
			expiresIn,
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			url: presignedUrl,
			bucket: bucketName,
			key,
			expiresIn,
			expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
			message: `Presigned download URL generated for '${bucketName}/${key}', valid for ${expiresIn} seconds`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Generate a presigned URL for uploading an object
 * Operation: Object > Get Presigned Upload URL
 */
export async function handleGetPresignedUploadUrl(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const expiresIn = this.getNodeParameter('expiresIn', itemIndex, 3600) as number;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		contentType?: string;
		acl?: string;
	};

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate object key
	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate expiration time
	if (expiresIn < 1 || expiresIn > 604800) {
		throw new NodeOperationError(
			this.getNode(),
			'Expiration time must be between 1 second and 604800 seconds (7 days)',
			{ itemIndex },
		);
	}

	const presignedUrl = await generatePresignedUrl.call(
		this,
		{
			bucket: bucketName,
			key,
			method: 'PUT',
			expiresIn,
			contentType: additionalFields.contentType,
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			url: presignedUrl,
			bucket: bucketName,
			key,
			expiresIn,
			expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
			contentType: additionalFields.contentType,
			acl: additionalFields.acl,
			message: `Presigned upload URL generated for '${bucketName}/${key}', valid for ${expiresIn} seconds`,
		},
		pairedItem: { item: itemIndex },
	};
}

// ============================================================================
// Multipart Upload Operation Handlers
// ============================================================================

/**
 * Create a multipart upload session
 * Operation: Object > Create Multipart Upload
 */
export async function handleCreateMultipartUpload(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		contentType?: string;
		acl?: string;
		storageClass?: string;
	};

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate object key
	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	const headers: Record<string, string> = {};
	if (additionalFields.contentType) {
		headers['Content-Type'] = additionalFields.contentType;
	}

	const response = await s3ApiRequest.call(
		this,
		{
			method: 'POST',
			bucket: bucketName,
			key,
			path: '',
			query: { uploads: '' },
			headers,
		},
		itemIndex,
	);

	const result = response?.InitiateMultipartUploadResult;

	return {
		json: {
			success: true,
			bucket: result?.Bucket || bucketName,
			key: result?.Key || key,
			uploadId: result?.UploadId,
			message: `Multipart upload initiated for '${bucketName}/${key}'. Use this Upload ID for subsequent operations.`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Upload a single part of a multipart upload
 * Operation: Object > Upload Part
 */
export async function handleUploadPart(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const uploadId = this.getNodeParameter('uploadId', itemIndex) as string;
	const partNumber = this.getNodeParameter('partNumber', itemIndex) as number;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;

	// Validate inputs
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'Upload ID is required. Get it from Create Multipart Upload operation.',
			{ itemIndex },
		);
	}

	if (partNumber < 1 || partNumber > 10000) {
		throw new NodeOperationError(
			this.getNode(),
			'Part number must be between 1 and 10000',
			{ itemIndex },
		);
	}

	// Get binary data
	const binaryData = await getBinaryDataBuffer.call(this, itemIndex, binaryPropertyName);
	const body = binaryData.buffer;

	const response = await s3ApiRequestRaw.call(
		this,
		{
			method: 'PUT',
			bucket: bucketName,
			key,
			path: '',
			query: {
				partNumber: String(partNumber),
				uploadId,
			},
			body,
		},
		itemIndex,
	);

	const etag = response.headers['etag'];

	return {
		json: {
			success: true,
			bucket: bucketName,
			key,
			uploadId,
			partNumber,
			etag,
			size: body.length,
			message: `Part ${partNumber} uploaded successfully. Save the ETag for completing the upload.`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Complete a multipart upload by combining all parts
 * Operation: Object > Complete Multipart Upload
 */
export async function handleCompleteMultipartUpload(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const uploadId = this.getNodeParameter('uploadId', itemIndex) as string;
	const partsJson = this.getNodeParameter('parts', itemIndex) as string;

	// Validate inputs
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'Upload ID is required',
			{ itemIndex },
		);
	}

	// Parse parts JSON
	let parts: Array<{ PartNumber: number; ETag: string }>;
	try {
		parts = JSON.parse(partsJson);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid parts JSON: ${(error as Error).message}. Expected format: [{"PartNumber":1,"ETag":"..."}]`,
			{ itemIndex },
		);
	}

	// Validate parts array
	if (!Array.isArray(parts) || parts.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Parts must be a non-empty array',
			{ itemIndex },
		);
	}

	// Validate each part has required fields
	for (const part of parts) {
		if (!part.PartNumber || !part.ETag) {
			throw new NodeOperationError(
				this.getNode(),
				'Each part must have PartNumber and ETag',
				{ itemIndex },
			);
		}
	}

	// Build CompleteMultipartUpload XML
	const completeXml = buildXml(
		{
			CompleteMultipartUpload: {
				Part: parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
			},
		},
		'CompleteMultipartUpload',
	);

	const response = await s3ApiRequest.call(
		this,
		{
			method: 'POST',
			bucket: bucketName,
			key,
			path: '',
			query: { uploadId },
			headers: { 'Content-Type': 'application/xml' },
			body: completeXml,
		},
		itemIndex,
	);

	const result = response?.CompleteMultipartUploadResult;

	return {
		json: {
			success: true,
			location: result?.Location,
			bucket: result?.Bucket || bucketName,
			key: result?.Key || key,
			etag: result?.ETag,
			totalParts: parts.length,
			message: `Multipart upload completed successfully for '${bucketName}/${key}' with ${parts.length} parts.`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Abort/cancel a multipart upload
 * Operation: Object > Abort Multipart Upload
 */
export async function handleAbortMultipartUpload(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const uploadId = this.getNodeParameter('uploadId', itemIndex) as string;

	// Validate inputs
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'Upload ID is required',
			{ itemIndex },
		);
	}

	await s3ApiRequest.call(
		this,
		{
			method: 'DELETE',
			bucket: bucketName,
			key,
			path: '',
			query: { uploadId },
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			bucket: bucketName,
			key,
			uploadId,
			message: `Multipart upload '${uploadId}' for '${bucketName}/${key}' has been aborted. All uploaded parts have been deleted.`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * List parts of a multipart upload
 * Operation: Object > List Parts
 */
export async function handleListParts(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;
	const uploadId = this.getNodeParameter('uploadId', itemIndex) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as {
		maxParts?: number;
		partNumberMarker?: number;
	};

	// Validate inputs
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'Upload ID is required',
			{ itemIndex },
		);
	}

	const query: Record<string, string> = { uploadId };
	if (options.maxParts) {
		query['max-parts'] = String(options.maxParts);
	}
	if (options.partNumberMarker) {
		query['part-number-marker'] = String(options.partNumberMarker);
	}

	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', bucket: bucketName, key, path: '', query },
		itemIndex,
	);

	const result = response?.ListPartsResult;
	let parts = result?.Part || [];

	// Handle single part vs array
	if (parts && !Array.isArray(parts)) {
		parts = [parts];
	}

	const returnData: INodeExecutionData[] = parts.map((part: any) => ({
		json: {
			partNumber: part.PartNumber ? parseInt(part.PartNumber, 10) : undefined,
			lastModified: part.LastModified,
			etag: part.ETag,
			size: part.Size ? parseInt(part.Size, 10) : 0,
			sizeFormatted: formatBytes(part.Size ? parseInt(part.Size, 10) : 0),
			bucket: bucketName,
			key,
			uploadId,
		},
		pairedItem: { item: itemIndex },
	}));

	// If no parts found, return single item with metadata
	if (returnData.length === 0) {
		return [
			{
				json: {
					success: true,
					bucket: bucketName,
					key,
					uploadId,
					totalParts: 0,
					isTruncated: result?.IsTruncated === 'true',
					message: 'No parts found for this upload',
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

	return returnData;
}

/**
 * List all multipart uploads in a bucket
 * Operation: Object > List Multipart Uploads
 */
export async function handleListMultipartUploads(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as {
		prefix?: string;
		maxUploads?: number;
		keyMarker?: string;
		uploadIdMarker?: string;
	};

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const query: Record<string, string> = { uploads: '' };
	if (options.prefix) {
		query['prefix'] = options.prefix;
	}
	if (options.maxUploads) {
		query['max-uploads'] = String(options.maxUploads);
	}
	if (options.keyMarker) {
		query['key-marker'] = options.keyMarker;
	}
	if (options.uploadIdMarker) {
		query['upload-id-marker'] = options.uploadIdMarker;
	}

	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', bucket: bucketName, path: '', query },
		itemIndex,
	);

	const result = response?.ListMultipartUploadsResult;
	let uploads = result?.Upload || [];

	// Handle single upload vs array
	if (uploads && !Array.isArray(uploads)) {
		uploads = [uploads];
	}

	const returnData: INodeExecutionData[] = uploads.map((upload: any) => ({
		json: {
			key: upload.Key,
			uploadId: upload.UploadId,
			initiated: upload.Initiated,
			storageClass: upload.StorageClass,
			bucket: bucketName,
		},
		pairedItem: { item: itemIndex },
	}));

	// If no uploads found, return single item with metadata
	if (returnData.length === 0) {
		return [
			{
				json: {
					success: true,
					bucket: bucketName,
					totalUploads: 0,
					isTruncated: result?.IsTruncated === 'true',
					message: 'No active multipart uploads found in this bucket',
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

	return returnData;
}

/**
 * Copy data from an existing object as a part in multipart upload
 * Operation: Object > Upload Part Copy
 */
export async function handleUploadPartCopy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const destinationBucket = this.getNodeParameter('destinationBucket', itemIndex) as string;
	const destinationKey = this.getNodeParameter('destinationKey', itemIndex) as string;
	const uploadId = this.getNodeParameter('uploadId', itemIndex) as string;
	const partNumber = this.getNodeParameter('partNumber', itemIndex) as number;
	const sourceBucket = this.getNodeParameter('sourceBucket', itemIndex) as string;
	const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		copySourceRange?: string;
	};

	// Validate destination bucket
	const destBucketValidation = validateBucketName(destinationBucket);
	if (!destBucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid destination bucket name: ${destBucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate destination key
	const destKeyValidation = validateObjectKey(destinationKey);
	if (!destKeyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid destination key: ${destKeyValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate source bucket
	const sourceBucketValidation = validateBucketName(sourceBucket);
	if (!sourceBucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid source bucket name: ${sourceBucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate source key
	const sourceKeyValidation = validateObjectKey(sourceKey);
	if (!sourceKeyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid source key: ${sourceKeyValidation.error}`,
			{ itemIndex },
		);
	}

	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'Upload ID is required',
			{ itemIndex },
		);
	}

	if (partNumber < 1 || partNumber > 10000) {
		throw new NodeOperationError(
			this.getNode(),
			'Part number must be between 1 and 10000',
			{ itemIndex },
		);
	}

	const headers: Record<string, string> = {
		'x-amz-copy-source': `/${sourceBucket}/${sourceKey}`,
	};

	if (additionalFields.copySourceRange) {
		headers['x-amz-copy-source-range'] = additionalFields.copySourceRange;
	}

	const response = await s3ApiRequest.call(
		this,
		{
			method: 'PUT',
			bucket: destinationBucket,
			key: destinationKey,
			path: '',
			query: {
				partNumber: String(partNumber),
				uploadId,
			},
			headers,
		},
		itemIndex,
	);

	const result = response?.CopyPartResult;

	return {
		json: {
			success: true,
			destinationBucket,
			destinationKey,
			uploadId,
			partNumber,
			sourceBucket,
			sourceKey,
			etag: result?.ETag,
			lastModified: result?.LastModified,
			copySourceRange: additionalFields.copySourceRange,
			message: `Part ${partNumber} copied successfully from '${sourceBucket}/${sourceKey}' to '${destinationBucket}/${destinationKey}'. Save the ETag for completing the upload.`,
		},
		pairedItem: { item: itemIndex },
	};
}

// ============================================================================
// ACL & Policy Operation Handlers
// ============================================================================

/**
 * Get bucket Access Control List (ACL)
 * Operation: Bucket > Get ACL
 */
export async function handleGetBucketAcl(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', bucket: bucketName, path: '', query: { acl: '' } },
		itemIndex,
	);

	const result = response?.AccessControlPolicy;
	let grants = result?.AccessControlList?.Grant || [];

	// Handle single grant vs array
	if (grants && !Array.isArray(grants)) {
		grants = [grants];
	}

	return {
		json: {
			success: true,
			bucket: bucketName,
			owner: result?.Owner,
			grants,
			totalGrants: grants.length,
			message: `Retrieved ACL for bucket '${bucketName}' with ${grants.length} grant(s)`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Get bucket policy
 * Operation: Bucket > Get Policy
 */
export async function handleGetBucketPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	try {
		const response = await s3ApiRequestRaw.call(
			this,
			{ method: 'GET', bucket: bucketName, path: '', query: { policy: '' } },
			itemIndex,
		);

		// Policy is returned as JSON string in body
		const policyString = response.body.toString();

		// Parse the policy string to JSON for better readability
		let policyObject;
		try {
			policyObject = policyString ? JSON.parse(policyString) : null;
		} catch {
			// If parsing fails, return as string
			policyObject = policyString;
		}

		return {
			json: {
				success: true,
				bucket: bucketName,
				policy: policyObject,
				policyString,
				message: `Retrieved policy for bucket '${bucketName}'`,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// If no policy exists, return a friendly message instead of error
		const errorMessage = (error as Error).message || '';
		if (errorMessage.includes('NoSuchBucketPolicy') || errorMessage.includes('404')) {
			return {
				json: {
					success: true,
					bucket: bucketName,
					policy: null,
					message: `No policy is set on bucket '${bucketName}'`,
				},
				pairedItem: { item: itemIndex },
			};
		}
		throw error;
	}
}

/**
 * Set/update bucket policy
 * Operation: Bucket > Put Policy
 */
export async function handlePutBucketPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const policyInput = this.getNodeParameter('policy', itemIndex) as string;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate and normalize policy JSON
	let policyString: string;
	let policyObject: IDataObject;

	// Parse if string, or use as-is if object
	try {
		policyObject = typeof policyInput === 'string' ? JSON.parse(policyInput) : policyInput;
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy JSON: ${(error as Error).message}. Policy must be a valid JSON string or object.`,
			{ itemIndex },
		);
	}

	// Validate required fields
	if (!policyObject.Version) {
		throw new NodeOperationError(
			this.getNode(),
			'Policy must contain a "Version" field (e.g., "2012-10-17")',
			{ itemIndex },
		);
	}
	if (!policyObject.Statement || !Array.isArray(policyObject.Statement)) {
		throw new NodeOperationError(
			this.getNode(),
			'Policy must contain a "Statement" array',
			{ itemIndex },
		);
	}

	// Convert to string for API
	policyString = JSON.stringify(policyObject);

	await s3ApiRequest.call(
		this,
		{
			method: 'PUT',
			bucket: bucketName,
			path: '',
			query: { policy: '' },
			headers: { 'Content-Type': 'application/json' },
			body: policyString,
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			bucket: bucketName,
			message: `Bucket policy has been set on '${bucketName}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Delete bucket policy
 * Operation: Bucket > Delete Policy
 */
export async function handleDeleteBucketPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	try {
		await s3ApiRequest.call(
			this,
			{ method: 'DELETE', bucket: bucketName, path: '', query: { policy: '' } },
			itemIndex,
		);

		return {
			json: {
				success: true,
				bucket: bucketName,
				message: `Bucket policy has been removed from '${bucketName}'`,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// If no policy exists, return success anyway
		const errorMessage = (error as Error).message || '';
		if (errorMessage.includes('NoSuchBucketPolicy') || errorMessage.includes('404')) {
			return {
				json: {
					success: true,
					bucket: bucketName,
					message: `No policy was set on bucket '${bucketName}' (already removed or never existed)`,
				},
				pairedItem: { item: itemIndex },
			};
		}
		throw error;
	}
}

/**
 * Get object Access Control List (ACL)
 * Operation: Object > Get ACL
 */
export async function handleGetObjectAcl(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
	const key = this.getNodeParameter('key', itemIndex) as string;

	// Validate bucket name
	const bucketValidation = validateBucketName(bucketName);
	if (!bucketValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid bucket name: ${bucketValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate object key
	const keyValidation = validateObjectKey(key);
	if (!keyValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid object key: ${keyValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await s3ApiRequest.call(
		this,
		{ method: 'GET', bucket: bucketName, key, path: '', query: { acl: '' } },
		itemIndex,
	);

	const result = response?.AccessControlPolicy;
	let grants = result?.AccessControlList?.Grant || [];

	// Handle single grant vs array
	if (grants && !Array.isArray(grants)) {
		grants = [grants];
	}

	return {
		json: {
			success: true,
			bucket: bucketName,
			key,
			owner: result?.Owner,
			grants,
			totalGrants: grants.length,
			message: `Retrieved ACL for object '${bucketName}/${key}' with ${grants.length} grant(s)`,
		},
		pairedItem: { item: itemIndex },
	};
}

// ============================================================================
// IAM Operation Handlers
// ============================================================================

/**
 * Get IAM Policy details
 * Operation: IAM > Get Policy
 */
export async function handleGetPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	const response = await iamApiRequest.call(
		this,
		{
			action: 'GetPolicy',
			params: { PolicyArn: policyArn },
		},
		itemIndex,
	);

	const policy = response?.GetPolicyResult?.Policy;

	return {
		json: {
			success: true,
			policyArn,
			policy,
			message: `Retrieved policy '${policy?.PolicyName || policyArn}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Get specific version of an IAM Policy
 * Operation: IAM > Get Policy Version
 */
export async function handleGetPolicyVersion(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;
	const versionId = this.getNodeParameter('versionId', itemIndex) as string;

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	if (!versionId || versionId.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Version ID is required',
			{ itemIndex },
		);
	}

	const response = await iamApiRequest.call(
		this,
		{
			action: 'GetPolicyVersion',
			params: { PolicyArn: policyArn, VersionId: versionId },
		},
		itemIndex,
	);

	const policyVersion = response?.GetPolicyVersionResult?.PolicyVersion;

	// Parse policy document if present
	let policyDocument;
	if (policyVersion?.Document) {
		try {
			policyDocument = JSON.parse(decodeURIComponent(policyVersion.Document));
		} catch {
			policyDocument = policyVersion.Document;
		}
	}

	return {
		json: {
			success: true,
			policyArn,
			versionId,
			policyVersion,
			policyDocument,
			message: `Retrieved policy version '${versionId}' for '${policyArn}'`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * List all IAM Policies
 * Operation: IAM > List Policies
 */
export async function handleListPolicies(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 100) as number;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const params: Record<string, string> = {};

	if (!returnAll) {
		params.MaxItems = String(limit);
	}
	if (additionalFields.scope) {
		params.Scope = additionalFields.scope as string;
	}
	if (additionalFields.pathPrefix) {
		params.PathPrefix = additionalFields.pathPrefix as string;
	}

	const response = await iamApiRequest.call(this, { action: 'ListPolicies', params }, itemIndex);

	let policies = response?.ListPoliciesResult?.Policies?.member || [];

	// Handle single policy vs array
	if (policies && !Array.isArray(policies)) {
		policies = [policies];
	}

	return policies.map((policy: any) => ({
		json: {
			policyName: policy.PolicyName,
			policyId: policy.PolicyId,
			arn: policy.Arn,
			path: policy.Path,
			defaultVersionId: policy.DefaultVersionId,
			attachmentCount: policy.AttachmentCount ? parseInt(policy.AttachmentCount, 10) : 0,
			permissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount ? parseInt(policy.PermissionsBoundaryUsageCount, 10) : 0,
			isAttachable: policy.IsAttachable === 'true',
			description: policy.Description,
			createDate: policy.CreateDate,
			updateDate: policy.UpdateDate,
		},
		pairedItem: { item: itemIndex },
	}));
}

/**
 * List IAM Policies attached to a User
 * Operation: IAM > List Attached User Policies
 */
export async function handleListAttachedUserPolicies(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const userName = this.getNodeParameter('userName', itemIndex) as string;
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 100) as number;

	// Validate user name
	const nameValidation = validateIAMName(userName, 'user');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid user name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	const params: Record<string, string> = {
		UserName: userName,
	};

	if (!returnAll) {
		params.MaxItems = String(limit);
	}

	const response = await iamApiRequest.call(this, { action: 'ListAttachedUserPolicies', params }, itemIndex);

	let policies = response?.ListAttachedUserPoliciesResult?.AttachedPolicies?.member || [];

	// Handle single policy vs array
	if (policies && !Array.isArray(policies)) {
		policies = [policies];
	}

	if (policies.length === 0) {
		return [
			{
				json: {
					success: true,
					userName,
					message: `No policies attached to user '${userName}'`,
					policies: [],
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

	return policies.map((policy: any) => ({
		json: {
			userName,
			policyName: policy.PolicyName,
			policyArn: policy.PolicyArn,
		},
		pairedItem: { item: itemIndex },
	}));
}

/**
 * List IAM Policies attached to a Group
 * Operation: IAM > List Attached Group Policies
 */
export async function handleListAttachedGroupPolicies(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const groupName = this.getNodeParameter('groupName', itemIndex) as string;
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 100) as number;

	// Validate group name
	const nameValidation = validateIAMName(groupName, 'group');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid group name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	const params: Record<string, string> = {
		GroupName: groupName,
	};

	if (!returnAll) {
		params.MaxItems = String(limit);
	}

	const response = await iamApiRequest.call(this, { action: 'ListAttachedGroupPolicies', params }, itemIndex);

	let policies = response?.ListAttachedGroupPoliciesResult?.AttachedPolicies?.member || [];

	// Handle single policy vs array
	if (policies && !Array.isArray(policies)) {
		policies = [policies];
	}

	if (policies.length === 0) {
		return [
			{
				json: {
					success: true,
					groupName,
					message: `No policies attached to group '${groupName}'`,
					policies: [],
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

	return policies.map((policy: any) => ({
		json: {
			groupName,
			policyName: policy.PolicyName,
			policyArn: policy.PolicyArn,
		},
		pairedItem: { item: itemIndex },
	}));
}

/**
 * Attach IAM Policy to a User
 * Operation: IAM > Attach User Policy
 */
export async function handleAttachUserPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const userName = this.getNodeParameter('userName', itemIndex) as string;
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;

	// Validate user name
	const nameValidation = validateIAMName(userName, 'user');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid user name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	await iamApiRequest.call(
		this,
		{
			action: 'AttachUserPolicy',
			params: { UserName: userName, PolicyArn: policyArn },
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			userName,
			policyArn,
			message: `Policy '${policyArn}' attached to user '${userName}' successfully`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Attach IAM Policy to a Group
 * Operation: IAM > Attach Group Policy
 */
export async function handleAttachGroupPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const groupName = this.getNodeParameter('groupName', itemIndex) as string;
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;

	// Validate group name
	const nameValidation = validateIAMName(groupName, 'group');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid group name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	await iamApiRequest.call(
		this,
		{
			action: 'AttachGroupPolicy',
			params: { GroupName: groupName, PolicyArn: policyArn },
		},
		itemIndex,
	);

	return {
		json: {
			success: true,
			groupName,
			policyArn,
			message: `Policy '${policyArn}' attached to group '${groupName}' successfully`,
		},
		pairedItem: { item: itemIndex },
	};
}

/**
 * Detach IAM Policy from a User
 * Operation: IAM > Detach User Policy
 */
export async function handleDetachUserPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const userName = this.getNodeParameter('userName', itemIndex) as string;
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;

	// Validate user name
	const nameValidation = validateIAMName(userName, 'user');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid user name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	try {
		await iamApiRequest.call(
			this,
			{
				action: 'DetachUserPolicy',
				params: { UserName: userName, PolicyArn: policyArn },
			},
			itemIndex,
		);

		return {
			json: {
				success: true,
				userName,
				policyArn,
				message: `Policy '${policyArn}' detached from user '${userName}' successfully`,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// If policy not attached, return success anyway (idempotent)
		const errorMessage = (error as Error).message || '';
		if (errorMessage.includes('NoSuchEntity')) {
			return {
				json: {
					success: true,
					userName,
					policyArn,
					message: `Policy '${policyArn}' was not attached to user '${userName}' (already detached or never attached)`,
				},
				pairedItem: { item: itemIndex },
			};
		}
		throw error;
	}
}

/**
 * Detach IAM Policy from a Group
 * Operation: IAM > Detach Group Policy
 */
export async function handleDetachGroupPolicy(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const groupName = this.getNodeParameter('groupName', itemIndex) as string;
	const policyArn = this.getNodeParameter('policyArn', itemIndex) as string;

	// Validate group name
	const nameValidation = validateIAMName(groupName, 'group');
	if (!nameValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid group name: ${nameValidation.error}`,
			{ itemIndex },
		);
	}

	// Validate policy ARN
	const arnValidation = validatePolicyArn(policyArn);
	if (!arnValidation.valid) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid policy ARN: ${arnValidation.error}`,
			{ itemIndex },
		);
	}

	try {
		await iamApiRequest.call(
			this,
			{
				action: 'DetachGroupPolicy',
				params: { GroupName: groupName, PolicyArn: policyArn },
			},
			itemIndex,
		);

		return {
			json: {
				success: true,
				groupName,
				policyArn,
				message: `Policy '${policyArn}' detached from group '${groupName}' successfully`,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// If policy not attached, return success anyway (idempotent)
		const errorMessage = (error as Error).message || '';
		if (errorMessage.includes('NoSuchEntity')) {
			return {
				json: {
					success: true,
					groupName,
					policyArn,
					message: `Policy '${policyArn}' was not attached to group '${groupName}' (already detached or never attached)`,
				},
				pairedItem: { item: itemIndex },
			};
		}
		throw error;
	}
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
