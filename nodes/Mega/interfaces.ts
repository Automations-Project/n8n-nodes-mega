/**
 * TypeScript interfaces for Mega S4 (S3-compatible) operations
 * Following n8n 2025 best practices for strict typing
 */

// ============================================================================
// Credential Interfaces
// ============================================================================

export interface IMegaCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	customEndpoint?: string;
	forcePathStyle?: boolean;
}

// ============================================================================
// S3 Bucket Interfaces
// ============================================================================

export interface IS3Bucket {
	Name?: string;
	CreationDate?: string;
}

export interface IListBucketsResponse {
	Buckets?: IS3Bucket[];
	Owner?: {
		DisplayName?: string;
		ID?: string;
	};
}

export interface ICreateBucketResponse {
	Location?: string;
}

export interface IGetBucketLocationResponse {
	LocationConstraint?: string;
}

// ============================================================================
// S3 Object Interfaces
// ============================================================================

export interface IS3Object {
	Key?: string;
	LastModified?: string;
	ETag?: string;
	Size?: number;
	StorageClass?: string;
	Owner?: {
		DisplayName?: string;
		ID?: string;
	};
}

export interface IListObjectsResponse {
	IsTruncated?: boolean;
	Marker?: string;
	NextMarker?: string;
	Contents?: IS3Object[];
	Name?: string;
	Prefix?: string;
	Delimiter?: string;
	MaxKeys?: number;
	CommonPrefixes?: Array<{ Prefix?: string }>;
	EncodingType?: string;
}

export interface IListObjectsV2Response {
	IsTruncated?: boolean;
	Contents?: IS3Object[];
	Name?: string;
	Prefix?: string;
	Delimiter?: string;
	MaxKeys?: number;
	CommonPrefixes?: Array<{ Prefix?: string }>;
	EncodingType?: string;
	KeyCount?: number;
	ContinuationToken?: string;
	NextContinuationToken?: string;
	StartAfter?: string;
}

export interface IPutObjectResponse {
	ETag?: string;
	VersionId?: string;
	ServerSideEncryption?: string;
}

export interface IGetObjectResponse {
	Body?: any; // Stream or Buffer
	ContentType?: string;
	ContentLength?: number;
	ETag?: string;
	LastModified?: string;
	Metadata?: Record<string, string>;
}

export interface IHeadObjectResponse {
	ContentType?: string;
	ContentLength?: number;
	ETag?: string;
	LastModified?: string;
	Metadata?: Record<string, string>;
	VersionId?: string;
	StorageClass?: string;
}

export interface ICopyObjectResponse {
	CopyObjectResult?: {
		ETag?: string;
		LastModified?: string;
	};
	VersionId?: string;
}

export interface IDeleteObjectResponse {
	DeleteMarker?: boolean;
	VersionId?: string;
}

export interface IDeleteObjectsResponse {
	Deleted?: Array<{
		Key?: string;
		VersionId?: string;
		DeleteMarker?: boolean;
		DeleteMarkerVersionId?: string;
	}>;
	Errors?: Array<{
		Key?: string;
		Code?: string;
		Message?: string;
		VersionId?: string;
	}>;
}

// ============================================================================
// Multipart Upload Interfaces
// ============================================================================

export interface ICreateMultipartUploadResponse {
	Bucket?: string;
	Key?: string;
	UploadId?: string;
}

export interface IUploadPartResponse {
	ETag?: string;
	ServerSideEncryption?: string;
}

export interface ICompleteMultipartUploadResponse {
	Location?: string;
	Bucket?: string;
	Key?: string;
	ETag?: string;
	VersionId?: string;
}

export interface IAbortMultipartUploadResponse {
	// Abort operation returns empty response on success
	RequestCharged?: string;
}

export interface IUploadPartCopyResponse {
	CopyPartResult?: {
		ETag?: string;
		LastModified?: string;
	};
	ServerSideEncryption?: string;
}

export interface IListPartsResponse {
	Bucket?: string;
	Key?: string;
	UploadId?: string;
	PartNumberMarker?: number;
	NextPartNumberMarker?: number;
	MaxParts?: number;
	IsTruncated?: boolean;
	Parts?: Array<{
		PartNumber?: number;
		LastModified?: string;
		ETag?: string;
		Size?: number;
	}>;
}

export interface IListMultipartUploadsResponse {
	Bucket?: string;
	KeyMarker?: string;
	NextKeyMarker?: string;
	UploadIdMarker?: string;
	NextUploadIdMarker?: string;
	MaxUploads?: number;
	IsTruncated?: boolean;
	Uploads?: Array<{
		Key?: string;
		UploadId?: string;
		Initiated?: string;
		StorageClass?: string;
	}>;
	CommonPrefixes?: Array<{ Prefix?: string }>;
}

// ============================================================================
// ACL & Policy Interfaces
// ============================================================================

export interface IGetBucketAclResponse {
	Owner?: {
		DisplayName?: string;
		ID?: string;
	};
	Grants?: Array<{
		Grantee?: {
			Type?: string;
			ID?: string;
			DisplayName?: string;
			URI?: string;
		};
		Permission?: string;
	}>;
}

export interface IGetObjectAclResponse extends IGetBucketAclResponse {}

export interface IGetBucketPolicyResponse {
	Policy?: string; // JSON string
}

export interface IPutBucketPolicyResponse {
	$metadata?: {
		httpStatusCode?: number;
		requestId?: string;
	};
}

export interface IDeleteBucketPolicyResponse {
	$metadata?: {
		httpStatusCode?: number;
		requestId?: string;
	};
}

// ============================================================================
// Operation Parameter Interfaces
// ============================================================================

export interface IListObjectsParams {
	bucket: string;
	prefix?: string;
	delimiter?: string;
	maxKeys?: number;
	marker?: string;
	encodingType?: string;
}

export interface IListObjectsV2Params {
	bucket: string;
	prefix?: string;
	delimiter?: string;
	maxKeys?: number;
	continuationToken?: string;
	startAfter?: string;
	encodingType?: string;
}

export interface IPutObjectParams {
	bucket: string;
	key: string;
	body: Buffer | string;
	contentType?: string;
	metadata?: Record<string, string>;
	storageClass?: string;
	acl?: string;
}

export interface IGetObjectParams {
	bucket: string;
	key: string;
	versionId?: string;
	range?: string;
}

export interface IDeleteObjectParams {
	bucket: string;
	key: string;
	versionId?: string;
}

export interface IDeleteObjectsParams {
	bucket: string;
	objects: Array<{ Key: string; VersionId?: string }>;
	quiet?: boolean;
}

export interface ICopyObjectParams {
	sourceBucket: string;
	sourceKey: string;
	destinationBucket: string;
	destinationKey: string;
	metadata?: Record<string, string>;
	metadataDirective?: 'COPY' | 'REPLACE';
}

export interface ICreateBucketParams {
	bucket: string;
	region?: string;
	acl?: string;
}

// ============================================================================
// Generic Response Wrapper
// ============================================================================

export interface IApiResponse<T> {
	success: boolean;
	data?: T;
	message?: string;
	errors?: Array<{
		code?: string;
		message?: string;
		key?: string;
	}>;
	// Pagination support
	isTruncated?: boolean;
	nextToken?: string;
	nextMarker?: string;
}

// ============================================================================
// Resource & Operation Type Unions
// ============================================================================

export type MegaResource = 'bucket' | 'object';

// ============================================================================
// IAM Interfaces
// ============================================================================

export interface IGetPolicyResponse {
	Policy?: {
		PolicyName?: string;
		PolicyId?: string;
		Arn?: string;
		Path?: string;
		DefaultVersionId?: string;
		AttachmentCount?: number;
		PermissionsBoundaryUsageCount?: number;
		IsAttachable?: boolean;
		Description?: string;
		CreateDate?: Date;
		UpdateDate?: Date;
	};
}

export interface IGetPolicyVersionResponse {
	PolicyVersion?: {
		Document?: string; // URL-encoded JSON policy document
		VersionId?: string;
		IsDefaultVersion?: boolean;
		CreateDate?: Date;
	};
}

export interface IListPoliciesResponse {
	Policies?: Array<{
		PolicyName?: string;
		PolicyId?: string;
		Arn?: string;
		Path?: string;
		DefaultVersionId?: string;
		AttachmentCount?: number;
		PermissionsBoundaryUsageCount?: number;
		IsAttachable?: boolean;
		Description?: string;
		CreateDate?: Date;
		UpdateDate?: Date;
	}>;
	IsTruncated?: boolean;
	Marker?: string;
}

export interface IListAttachedPoliciesResponse {
	AttachedPolicies?: Array<{
		PolicyName?: string;
		PolicyArn?: string;
	}>;
	IsTruncated?: boolean;
	Marker?: string;
}

export interface IAttachPolicyResponse {
	$metadata?: {
		httpStatusCode?: number;
		requestId?: string;
	};
}

export interface IDetachPolicyResponse {
	$metadata?: {
		httpStatusCode?: number;
		requestId?: string;
	};
}

// ============================================================================
// Operation Type Definitions
// ============================================================================

export type BucketOperation = 
	| 'list'
	| 'create'
	| 'delete'
	| 'head'
	| 'getLocation'
	| 'getAcl'
	| 'putAcl'
	| 'getPolicy'
	| 'putPolicy'
	| 'deletePolicy';

export type ObjectOperation =
	| 'list'
	| 'listV2'
	| 'put'
	| 'get'
	| 'delete'
	| 'deleteMultiple'
	| 'head'
	| 'copy'
	| 'getAcl'
	| 'putAcl';

export type MultipartOperation =
	| 'createMultipart'
	| 'uploadPart'
	| 'uploadPartCopy'
	| 'completeMultipart'
	| 'abortMultipart'
	| 'listParts'
	| 'listMultipartUploads';

export type IAMOperation =
	| 'getPolicy'
	| 'getPolicyVersion'
	| 'listPolicies'
	| 'listAttachedUserPolicies'
	| 'listAttachedGroupPolicies'
	| 'attachUserPolicy'
	| 'attachGroupPolicy'
	| 'detachUserPolicy'
	| 'detachGroupPolicy';

export type MegaOperation = BucketOperation | ObjectOperation | MultipartOperation | IAMOperation;
