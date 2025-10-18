/**
 * Operation handler methods for Mega S4 node
 * Each handler implements a specific S3 operation with validation and error handling
 */

import {
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
	NodeOperationError,
	NodeApiError,
	JsonObject,
} from 'n8n-workflow';

// AWS SDK v3 S3 Commands
import {
	ListBucketsCommand,
	CreateBucketCommand,
	DeleteBucketCommand,
	HeadBucketCommand,
	GetBucketLocationCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	HeadObjectCommand,
	CopyObjectCommand,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	AbortMultipartUploadCommand,
	ListPartsCommand,
	ListMultipartUploadsCommand,
	UploadPartCopyCommand,
	GetBucketAclCommand,
	GetBucketPolicyCommand,
	PutBucketPolicyCommand,
	DeleteBucketPolicyCommand,
	GetObjectAclCommand,
} from '@aws-sdk/client-s3';

// AWS SDK v3 IAM Commands
import {
	GetPolicyCommand,
	GetPolicyVersionCommand,
	ListPoliciesCommand,
	ListAttachedUserPoliciesCommand,
	ListAttachedGroupPoliciesCommand,
	AttachUserPolicyCommand,
	AttachGroupPolicyCommand,
	DetachUserPolicyCommand,
	DetachGroupPolicyCommand,
	PolicyScopeType,
} from '@aws-sdk/client-iam';

import {
	executeS3Command,
	executeIAMCommand,
	getS3Client,
	validateBucketName,
	validateObjectKey,
	validatePolicyArn,
	validateIAMName,
	getBinaryDataBuffer,
	streamToBuffer,
	buildPaginationParams,
} from './GenericFunctions';

import {
	IListBucketsResponse,
	ICreateBucketResponse,
	IGetBucketLocationResponse,
	IListObjectsV2Response,
	IPutObjectResponse,
	IGetObjectResponse,
	IHeadObjectResponse,
	ICopyObjectResponse,
	IDeleteObjectResponse,
	IDeleteObjectsResponse,
	ICreateMultipartUploadResponse,
	IUploadPartResponse,
	ICompleteMultipartUploadResponse,
	IListPartsResponse,
	IListMultipartUploadsResponse,
	IUploadPartCopyResponse,
	IGetBucketAclResponse,
	IGetBucketPolicyResponse,
	IGetObjectAclResponse,
	IGetPolicyResponse,
	IGetPolicyVersionResponse,
	IListPoliciesResponse,
	IListAttachedPoliciesResponse,
} from './interfaces';

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
	const command = new ListBucketsCommand({});
	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IListBucketsResponse;

	const buckets = response.Buckets || [];

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

	const command = new CreateBucketCommand({
		Bucket: bucketName,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as ICreateBucketResponse;

	return {
		json: {
			success: true,
			bucketName,
			location: response.Location,
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

	const command = new DeleteBucketCommand({
		Bucket: bucketName,
	});

	await executeS3Command.call(this, command, itemIndex);

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

	const command = new HeadBucketCommand({
		Bucket: bucketName,
	});

	await executeS3Command.call(this, command, itemIndex);

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

	const command = new GetBucketLocationCommand({
		Bucket: bucketName,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IGetBucketLocationResponse;

	return {
		json: {
			bucketName,
			region: response.LocationConstraint || 'us-east-1', // Empty means us-east-1 in AWS
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
		const paginationParams = buildPaginationParams(returnAll, limit, continuationToken);

		const command = new ListObjectsV2Command({
			Bucket: bucketName,
			Prefix: (additionalFields.prefix as string) || undefined,
			Delimiter: (additionalFields.delimiter as string) || undefined,
			StartAfter: (additionalFields.startAfter as string) || undefined,
			...paginationParams,
		});

		const response = (await executeS3Command.call(
			this,
			command,
			itemIndex,
		)) as IListObjectsV2Response;

		const contents = response.Contents || [];

		// Add each object as a separate item
		for (const obj of contents) {
			objects.push({
				json: {
					key: obj.Key,
					lastModified: obj.LastModified,
					etag: obj.ETag?.replace(/"/g, ''), // Remove quotes from ETag
					size: obj.Size,
					sizeFormatted: obj.Size ? formatBytes(obj.Size) : '0 Bytes',
					storageClass: obj.StorageClass,
					owner: obj.Owner,
				},
				pairedItem: { item: itemIndex },
			});
		}

		// Check if we need to continue pagination
		continuationToken = response.NextContinuationToken;

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

	// Build metadata
	let metadata: Record<string, string> | undefined;
	if (additionalFields.metadata) {
		const metadataValues = (additionalFields.metadata as IDataObject).metadataValues as IDataObject[];
		if (metadataValues && metadataValues.length > 0) {
			metadata = {};
			for (const item of metadataValues) {
				if (item.key && item.value) {
					metadata[item.key as string] = item.value as string;
				}
			}
		}
	}

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: objectKey,
		Body: body,
		ContentType: contentType,
		Metadata: metadata,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IPutObjectResponse;

	return {
		json: {
			success: true,
			bucketName,
			objectKey,
			etag: response.ETag?.replace(/"/g, ''),
			versionId: response.VersionId,
			size: typeof body === 'string' ? body.length : body.length,
			sizeFormatted: formatBytes(typeof body === 'string' ? body.length : body.length),
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

	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: objectKey,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IGetObjectResponse;

	// Convert stream to buffer
	const buffer = await streamToBuffer(response.Body);

	// Extract filename from key (last part after /)
	const fileName = objectKey.split('/').pop() || objectKey;

	// Prepare binary data
	const binaryData = await this.helpers.prepareBinaryData(
		buffer,
		fileName,
		response.ContentType,
	);

	return {
		json: {
			bucketName,
			objectKey,
			fileName,
			contentType: response.ContentType,
			size: response.ContentLength,
			sizeFormatted: formatBytes(response.ContentLength || 0),
			etag: response.ETag?.replace(/"/g, ''),
			lastModified: response.LastModified,
			metadata: response.Metadata,
		},
		binary: {
			[binaryPropertyName]: binaryData,
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

	const command = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: objectKey,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IDeleteObjectResponse;

	return {
		json: {
			success: true,
			bucketName,
			objectKey,
			deleteMarker: response.DeleteMarker,
			versionId: response.VersionId,
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

	const command = new DeleteObjectsCommand({
		Bucket: bucketName,
		Delete: {
			Objects: objectKeys.map((key) => ({ Key: key })),
			Quiet: (additionalFields.quiet as boolean) || false,
		},
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IDeleteObjectsResponse;

	return {
		json: {
			success: true,
			bucketName,
			deleted: response.Deleted || [],
			errors: response.Errors || [],
			deletedCount: response.Deleted?.length || 0,
			errorCount: response.Errors?.length || 0,
			message: `Deleted ${response.Deleted?.length || 0} objects from '${bucketName}'`,
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

	const command = new HeadObjectCommand({
		Bucket: bucketName,
		Key: objectKey,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IHeadObjectResponse;

	return {
		json: {
			bucketName,
			objectKey,
			contentType: response.ContentType,
			size: response.ContentLength,
			sizeFormatted: formatBytes(response.ContentLength || 0),
			etag: response.ETag?.replace(/"/g, ''),
			lastModified: response.LastModified,
			metadata: response.Metadata,
			versionId: response.VersionId,
			storageClass: response.StorageClass,
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

	const command = new CopyObjectCommand({
		CopySource: `${sourceBucket}/${sourceKey}`,
		Bucket: destinationBucket,
		Key: destinationKey,
		MetadataDirective: (additionalFields.metadataDirective as 'COPY' | 'REPLACE') || undefined,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as ICopyObjectResponse;

	return {
		json: {
			success: true,
			sourceBucket,
			sourceKey,
			destinationBucket,
			destinationKey,
			etag: response.CopyObjectResult?.ETag?.replace(/"/g, ''),
			lastModified: response.CopyObjectResult?.LastModified,
			versionId: response.VersionId,
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
	const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
	const { GetObjectCommand } = await import('@aws-sdk/client-s3');

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

	const s3Client = await getS3Client.call(this);
	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: key,
	});

	try {
		const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

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
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Failed to generate presigned URL for '${bucketName}/${key}': ${
				(error as Error).message
			}`,
			itemIndex,
		});
	}
}

/**
 * Generate a presigned URL for uploading an object
 * Operation: Object > Get Presigned Upload URL
 */
export async function handleGetPresignedUploadUrl(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
	const { PutObjectCommand } = await import('@aws-sdk/client-s3');

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

	const s3Client = await getS3Client.call(this);
	const commandParams: any = {
		Bucket: bucketName,
		Key: key,
	};

	// Add optional parameters
	if (additionalFields.contentType) {
		commandParams.ContentType = additionalFields.contentType;
	}

	const command = new PutObjectCommand(commandParams);

	try {
		const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

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
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Failed to generate presigned upload URL for '${bucketName}/${key}': ${
				(error as Error).message
			}`,
			itemIndex,
		});
	}
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

	const command = new CreateMultipartUploadCommand({
		Bucket: bucketName,
		Key: key,
		ContentType: additionalFields.contentType,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as ICreateMultipartUploadResponse;

	return {
		json: {
			success: true,
			bucket: response.Bucket || bucketName,
			key: response.Key || key,
			uploadId: response.UploadId,
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

	const command = new UploadPartCommand({
		Bucket: bucketName,
		Key: key,
		UploadId: uploadId,
		PartNumber: partNumber,
		Body: body,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IUploadPartResponse;

	return {
		json: {
			success: true,
			bucket: bucketName,
			key,
			uploadId,
			partNumber,
			etag: response.ETag,
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

	const command = new CompleteMultipartUploadCommand({
		Bucket: bucketName,
		Key: key,
		UploadId: uploadId,
		MultipartUpload: {
			Parts: parts,
		},
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as ICompleteMultipartUploadResponse;

	return {
		json: {
			success: true,
			location: response.Location,
			bucket: response.Bucket || bucketName,
			key: response.Key || key,
			etag: response.ETag,
			versionId: response.VersionId,
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

	const command = new AbortMultipartUploadCommand({
		Bucket: bucketName,
		Key: key,
		UploadId: uploadId,
	});

	await executeS3Command.call(this, command, itemIndex);

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

	const command = new ListPartsCommand({
		Bucket: bucketName,
		Key: key,
		UploadId: uploadId,
		MaxParts: options.maxParts,
		PartNumberMarker: options.partNumberMarker?.toString(),
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IListPartsResponse;

	const parts = response.Parts || [];
	const returnData: INodeExecutionData[] = parts.map((part) => ({
		json: {
			partNumber: part.PartNumber,
			lastModified: part.LastModified,
			etag: part.ETag,
			size: part.Size,
			sizeFormatted: formatBytes(part.Size || 0),
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
					isTruncated: response.IsTruncated || false,
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

	const command = new ListMultipartUploadsCommand({
		Bucket: bucketName,
		Prefix: options.prefix,
		MaxUploads: options.maxUploads,
		KeyMarker: options.keyMarker,
		UploadIdMarker: options.uploadIdMarker,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IListMultipartUploadsResponse;

	const uploads = response.Uploads || [];
	const returnData: INodeExecutionData[] = uploads.map((upload) => ({
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
					isTruncated: response.IsTruncated || false,
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

	const command = new UploadPartCopyCommand({
		Bucket: destinationBucket,
		Key: destinationKey,
		UploadId: uploadId,
		PartNumber: partNumber,
		CopySource: `${sourceBucket}/${sourceKey}`,
		CopySourceRange: additionalFields.copySourceRange,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IUploadPartCopyResponse;

	return {
		json: {
			success: true,
			destinationBucket,
			destinationKey,
			uploadId,
			partNumber,
			sourceBucket,
			sourceKey,
			etag: response.CopyPartResult?.ETag,
			lastModified: response.CopyPartResult?.LastModified,
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

	const command = new GetBucketAclCommand({
		Bucket: bucketName,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IGetBucketAclResponse;

	return {
		json: {
			success: true,
			bucket: bucketName,
			owner: response.Owner,
			grants: response.Grants || [],
			totalGrants: (response.Grants || []).length,
			message: `Retrieved ACL for bucket '${bucketName}' with ${(response.Grants || []).length} grant(s)`,
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

	const command = new GetBucketPolicyCommand({
		Bucket: bucketName,
	});

	try {
		const response = (await executeS3Command.call(
			this,
			command,
			itemIndex,
		)) as IGetBucketPolicyResponse;

		// Parse the policy string to JSON for better readability
		let policyObject;
		try {
			policyObject = response.Policy ? JSON.parse(response.Policy) : null;
		} catch (error) {
			// If parsing fails, return as string
			policyObject = response.Policy;
		}

		return {
			json: {
				success: true,
				bucket: bucketName,
				policy: policyObject,
				policyString: response.Policy,
				message: `Retrieved policy for bucket '${bucketName}'`,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// If no policy exists, return a friendly message instead of error
		if ((error as NodeApiError).httpCode === '404' || (error as any).name === 'NoSuchBucketPolicy') {
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

	const command = new PutBucketPolicyCommand({
		Bucket: bucketName,
		Policy: policyString,
	});

	await executeS3Command.call(this, command, itemIndex);

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

	const command = new DeleteBucketPolicyCommand({
		Bucket: bucketName,
	});

	try {
		await executeS3Command.call(this, command, itemIndex);

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
		if ((error as NodeApiError).httpCode === '404' || (error as any).name === 'NoSuchBucketPolicy') {
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

	const command = new GetObjectAclCommand({
		Bucket: bucketName,
		Key: key,
	});

	const response = (await executeS3Command.call(
		this,
		command,
		itemIndex,
	)) as IGetObjectAclResponse;

	return {
		json: {
			success: true,
			bucket: bucketName,
			key,
			owner: response.Owner,
			grants: response.Grants || [],
			totalGrants: (response.Grants || []).length,
			message: `Retrieved ACL for object '${bucketName}/${key}' with ${(response.Grants || []).length} grant(s)`,
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

	const command = new GetPolicyCommand({
		PolicyArn: policyArn,
	});

	const response = (await executeIAMCommand.call(
		this,
		command,
		itemIndex,
	)) as IGetPolicyResponse;

	return {
		json: {
			success: true,
			policyArn,
			policy: response.Policy,
			message: `Retrieved policy '${response.Policy?.PolicyName || policyArn}'`,
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

	const command = new GetPolicyVersionCommand({
		PolicyArn: policyArn,
		VersionId: versionId,
	});

	const response = (await executeIAMCommand.call(
		this,
		command,
		itemIndex,
	)) as IGetPolicyVersionResponse;

	// Parse policy document if present
	let policyDocument;
	if (response.PolicyVersion?.Document) {
		try {
			policyDocument = JSON.parse(decodeURIComponent(response.PolicyVersion.Document));
		} catch (error) {
			policyDocument = response.PolicyVersion.Document;
		}
	}

	return {
		json: {
			success: true,
			policyArn,
			versionId,
			policyVersion: response.PolicyVersion,
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

	const command = new ListPoliciesCommand({
		MaxItems: returnAll ? undefined : limit,
		Scope: additionalFields.scope as PolicyScopeType | undefined,
		PathPrefix: additionalFields.pathPrefix as string | undefined,
	});

	const response = (await executeIAMCommand.call(
		this,
		command,
		itemIndex,
	)) as IListPoliciesResponse;

	const policies = response.Policies || [];

	return policies.map((policy) => ({
		json: {
			policyName: policy.PolicyName,
			policyId: policy.PolicyId,
			arn: policy.Arn,
			path: policy.Path,
			defaultVersionId: policy.DefaultVersionId,
			attachmentCount: policy.AttachmentCount,
			permissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount,
			isAttachable: policy.IsAttachable,
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

	const command = new ListAttachedUserPoliciesCommand({
		UserName: userName,
		MaxItems: returnAll ? undefined : limit,
	});

	const response = (await executeIAMCommand.call(
		this,
		command,
		itemIndex,
	)) as IListAttachedPoliciesResponse;

	const policies = response.AttachedPolicies || [];

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

	return policies.map((policy) => ({
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

	const command = new ListAttachedGroupPoliciesCommand({
		GroupName: groupName,
		MaxItems: returnAll ? undefined : limit,
	});

	const response = (await executeIAMCommand.call(
		this,
		command,
		itemIndex,
	)) as IListAttachedPoliciesResponse;

	const policies = response.AttachedPolicies || [];

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

	return policies.map((policy) => ({
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

	const command = new AttachUserPolicyCommand({
		UserName: userName,
		PolicyArn: policyArn,
	});

	await executeIAMCommand.call(this, command, itemIndex);

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

	const command = new AttachGroupPolicyCommand({
		GroupName: groupName,
		PolicyArn: policyArn,
	});

	await executeIAMCommand.call(this, command, itemIndex);

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

	const command = new DetachUserPolicyCommand({
		UserName: userName,
		PolicyArn: policyArn,
	});

	try {
		await executeIAMCommand.call(this, command, itemIndex);

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
		if ((error as any).name === 'NoSuchEntity') {
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

	const command = new DetachGroupPolicyCommand({
		GroupName: groupName,
		PolicyArn: policyArn,
	});

	try {
		await executeIAMCommand.call(this, command, itemIndex);

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
		if ((error as any).name === 'NoSuchEntity') {
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
