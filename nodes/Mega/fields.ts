/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
/* eslint-disable n8n-nodes-base/node-param-type-options-password-missing */
/**
 * Parameter field definitions for all Mega S4 operations
 * Organized by resource and operation for maintainability
 */

import { INodeProperties } from 'n8n-workflow';

// ============================================================================
// Bucket Operation Fields
// ============================================================================

/**
 * Fields for Bucket > Create operation
 */
export const bucketCreateFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description:
			'Name of the bucket to create. Must be globally unique, 3-63 characters, lowercase letters, numbers, hyphens only.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create'],
			},
		},
		default: {},
		options: [],
	},
];

/**
 * Fields for Bucket > Delete operation
 */
export const bucketDeleteFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['delete'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to delete. The bucket must be empty.',
	},
];

/**
 * Fields for Bucket > Head operation
 */
export const bucketHeadFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['head'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to check',
	},
];

/**
 * Fields for Bucket > Get Location operation
 */
export const bucketGetLocationFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getLocation'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to get location for',
	},
];

// Bucket > List has no fields (lists all buckets)

// ============================================================================
// Object Operation Fields
// ============================================================================

/**
 * Fields for Object > List operation
 */
export const objectListFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['list'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to list objects from',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['list'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['list'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				default: '',
				placeholder: 'folder/subfolder/',
				description: 'Limits results to keys that begin with the specified prefix',
			},
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				default: '',
				placeholder: '/',
				description:
					'Character used to group keys. Commonly used to simulate folder structure.',
			},
			{
				displayName: 'Start After',
				name: 'startAfter',
				type: 'string',
				default: '',
				description: 'Start listing after this key (useful for pagination)',
			},
		],
	},
];

/**
 * Fields for Object > Upload (Put) operation
 */
export const objectPutFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to upload to',
	},
	{
		displayName: 'Object Key',
		name: 'objectKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
			},
		},
		default: '',
		placeholder: 'folder/file.txt',
		description: 'Key (path/name) for the object in the bucket',
	},
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
			},
		},
		default: true,
		description: 'Whether the data to upload is binary (file) or text',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
				binaryData: [true],
			},
		},
		default: 'data',
		description: 'Name of the binary property containing the file data',
	},
	{
		displayName: 'Text Data',
		name: 'textData',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
				binaryData: [false],
			},
		},
		default: '',
		description: 'Text content to upload',
		typeOptions: {
			rows: 5,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['put'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
				placeholder: 'image/png',
				description: 'MIME type of the object (e.g., image/png, application/pdf)',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Metadata',
				description: 'Custom metadata for the object',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Metadata key',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Metadata value',
							},
						],
					},
				],
			},
		],
	},
];

/**
 * Fields for Object > Download (Get) operation
 */
export const objectGetFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket containing the object',
	},
	{
		displayName: 'Object Key',
		name: 'objectKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: 'folder/file.txt',
		description: 'Key (path/name) of the object to download',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get'],
			},
		},
		default: 'data',
		description: 'Name of the binary property to store the downloaded file',
	},
];

/**
 * Fields for Object > Delete operation
 */
export const objectDeleteFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['delete'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket containing the object',
	},
	{
		displayName: 'Object Key',
		name: 'objectKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['delete'],
			},
		},
		default: '',
		placeholder: 'folder/file.txt',
		description: 'Key (path/name) of the object to delete',
	},
];

/**
 * Fields for Object > Delete Multiple operation
 */
export const objectDeleteMultipleFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['deleteMultiple'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket containing the objects',
	},
	{
		displayName: 'Object Keys',
		name: 'objectKeys',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['deleteMultiple'],
			},
		},
		default: '',
		placeholder: 'file1.txt,folder/file2.png,file3.pdf',
		description: 'Comma-separated list of object keys to delete',
		typeOptions: {
			rows: 3,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['deleteMultiple'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Quiet Mode',
				name: 'quiet',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable quiet mode (only returns errors, not successful deletions)',
			},
		],
	},
];

/**
 * Fields for Object > Head operation
 */
export const objectHeadFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['head'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket containing the object',
	},
	{
		displayName: 'Object Key',
		name: 'objectKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['head'],
			},
		},
		default: '',
		placeholder: 'folder/file.txt',
		description: 'Key (path/name) of the object to get metadata for',
	},
];

/**
 * Fields for Object > Copy operation
 */
export const objectCopyFields: INodeProperties[] = [
	{
		displayName: 'Source Bucket Name',
		name: 'sourceBucket',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['copy'],
			},
		},
		default: '',
		placeholder: 'source-bucket',
		description: 'Name of the bucket containing the source object',
	},
	{
		displayName: 'Source Object Key',
		name: 'sourceKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['copy'],
			},
		},
		default: '',
		placeholder: 'source/file.txt',
		description: 'Key (path/name) of the source object',
	},
	{
		displayName: 'Destination Bucket Name',
		name: 'destinationBucket',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['copy'],
			},
		},
		default: '',
		placeholder: 'destination-bucket',
		description: 'Name of the bucket to copy the object to (can be the same as source)',
	},
	{
		displayName: 'Destination Object Key',
		name: 'destinationKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['copy'],
			},
		},
		default: '',
		placeholder: 'destination/file.txt',
		description: 'Key (path/name) for the copied object',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['copy'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Metadata Directive',
				name: 'metadataDirective',
				type: 'options',
				options: [
					{
						name: 'Copy',
						value: 'COPY',
						description: 'Copy metadata from source object',
					},
					{
						name: 'Replace',
						value: 'REPLACE',
						description: 'Replace with new metadata',
					},
				],
				default: 'COPY',
				description: 'How to handle metadata during the copy operation',
			},
		],
	},
];

/**
 * Fields for Object > Get Presigned URL operation
 */
export const objectGetPresignedUrlFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUrl'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket containing the object',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUrl'],
			},
		},
		default: '',
		placeholder: 'path/to/file.txt',
		description: 'Key (path/name) of the object to generate URL for',
	},
	{
		displayName: 'Expiration Time',
		name: 'expiresIn',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUrl'],
			},
		},
		default: 3600,
		description: 'Number of seconds until the URL expires (default: 3600 = 1 hour, max: 604800 = 7 days)',
		typeOptions: {
			minValue: 1,
			maxValue: 604800,
		},
	},
];

/**
 * Fields for Object > Get Presigned Upload URL operation
 */
export const objectGetPresignedUploadUrlFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUploadUrl'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to upload to',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUploadUrl'],
			},
		},
		default: '',
		placeholder: 'path/to/file.txt',
		description: 'Key (path/name) for the object to be uploaded',
	},
	{
		displayName: 'Expiration Time',
		name: 'expiresIn',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUploadUrl'],
			},
		},
		default: 3600,
		description: 'Number of seconds until the URL expires (default: 3600 = 1 hour, max: 604800 = 7 days)',
		typeOptions: {
			minValue: 1,
			maxValue: 604800,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getPresignedUploadUrl'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
				placeholder: 'image/png',
				description: 'MIME type of the file to be uploaded (e.g., image/png, application/pdf)',
			},
		],
	},
];

/**
 * Fields for Object > Create Multipart Upload operation
 */
export const objectCreateMultipartUploadFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['createMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to upload to',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['createMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'path/to/large-file.zip',
		description: 'Key (path/name) for the object to be uploaded',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['createMultipartUpload'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
				placeholder: 'application/zip',
				description: 'MIME type of the file',
			},
		],
	},
];

/**
 * Fields for Object > Upload Part operation
 */
export const objectUploadPartFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPart'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPart'],
			},
		},
		default: '',
		placeholder: 'path/to/large-file.zip',
		description: 'Key (path/name) of the object',
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPart'],
			},
		},
		default: '',
		placeholder: 'UploadId from CreateMultipartUpload',
		description: 'The upload ID returned from Create Multipart Upload',
	},
	{
		displayName: 'Part Number',
		name: 'partNumber',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPart'],
			},
		},
		default: 1,
		description: 'Part number (1-10000) identifying this part',
		typeOptions: {
			minValue: 1,
			maxValue: 10000,
		},
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPart'],
			},
		},
		default: 'data',
		placeholder: 'data',
		description: 'Name of the binary property containing the part data. If empty, will use input data field.',
	},
];

/**
 * Fields for Object > Complete Multipart Upload operation
 */
export const objectCompleteMultipartUploadFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['completeMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['completeMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'path/to/large-file.zip',
		description: 'Key (path/name) of the object',
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['completeMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'UploadId from CreateMultipartUpload',
		description: 'The upload ID returned from Create Multipart Upload',
	},
	{
		displayName: 'Parts',
		name: 'parts',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['completeMultipartUpload'],
			},
		},
		default: '',
		placeholder: '[{"PartNumber":1,"ETag":"..."},{"PartNumber":2,"ETag":"..."}]',
		description: 'JSON array of parts with PartNumber and ETag. Example: [{"PartNumber":1,"ETag":"abc123"}].',
		typeOptions: {
			rows: 5,
		},
	},
];

/**
 * Fields for Object > Abort Multipart Upload operation
 */
export const objectAbortMultipartUploadFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['abortMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['abortMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'path/to/large-file.zip',
		description: 'Key (path/name) of the object',
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['abortMultipartUpload'],
			},
		},
		default: '',
		placeholder: 'UploadId from CreateMultipartUpload',
		description: 'The upload ID to abort',
	},
];

/**
 * Fields for Object > List Parts operation
 */
export const objectListPartsFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listParts'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listParts'],
			},
		},
		default: '',
		placeholder: 'path/to/large-file.zip',
		description: 'Key (path/name) of the object',
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listParts'],
			},
		},
		default: '',
		placeholder: 'UploadId from CreateMultipartUpload',
		description: 'The upload ID to list parts for',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listParts'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Parts',
				name: 'maxParts',
				type: 'number',
				default: 1000,
				description: 'Maximum number of parts to return (1-1000)',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
			{
				displayName: 'Part Number Marker',
				name: 'partNumberMarker',
				type: 'number',
				default: 0,
				description: 'Part number after which to start listing',
			},
		],
	},
];

/**
 * Fields for Object > List Multipart Uploads operation
 */
export const objectListMultipartUploadsFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listMultipartUploads'],
			},
		},
		default: '',
		placeholder: 'my-bucket-name',
		description: 'Name of the bucket to list multipart uploads from',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['listMultipartUploads'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				default: '',
				placeholder: 'folder/',
				description: 'Limits the response to uploads with keys that begin with the specified prefix',
			},
			{
				displayName: 'Max Uploads',
				name: 'maxUploads',
				type: 'number',
				default: 1000,
				description: 'Maximum number of uploads to return (1-1000)',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
			{
				displayName: 'Key Marker',
				name: 'keyMarker',
				type: 'string',
				default: '',
				description: 'Key marker for pagination',
			},
			{
				displayName: 'Upload ID Marker',
				name: 'uploadIdMarker',
				type: 'string',
				default: '',
				description: 'Upload ID marker for pagination',
			},
		],
	},
];

/**
 * Fields for Object > Upload Part Copy operation
 */
export const objectUploadPartCopyFields: INodeProperties[] = [
	{
		displayName: 'Destination Bucket',
		name: 'destinationBucket',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: '',
		placeholder: 'destination-bucket',
		description: 'Name of the destination bucket',
	},
	{
		displayName: 'Destination Key',
		name: 'destinationKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: '',
		placeholder: 'path/to/destination-file.zip',
		description: 'Key (path/name) of the destination object',
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: '',
		placeholder: 'UploadId from CreateMultipartUpload',
		description: 'The upload ID for the multipart upload',
	},
	{
		displayName: 'Part Number',
		name: 'partNumber',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: 1,
		description: 'Part number (1-10000) identifying this part',
		typeOptions: {
			minValue: 1,
			maxValue: 10000,
		},
	},
	{
		displayName: 'Source Bucket',
		name: 'sourceBucket',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: '',
		placeholder: 'source-bucket',
		description: 'Name of the source bucket',
	},
	{
		displayName: 'Source Key',
		name: 'sourceKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: '',
		placeholder: 'path/to/source-file.zip',
		description: 'Key (path/name) of the source object to copy from',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['uploadPartCopy'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Copy Source Range',
				name: 'copySourceRange',
				type: 'string',
				default: '',
				placeholder: 'bytes=0-1048575',
				description: 'Range of bytes to copy from the source object (e.g., bytes=0-1048575 for first 1MB)',
			},
		],
	},
];

// ============================================================================
// Bucket ACL/Policy Fields
// ============================================================================

/**
 * Fields for Get Bucket ACL operation
 */
export const bucketGetAclFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getBucketAcl'],
			},
		},
		default: '',
		placeholder: 'my-bucket',
		description: 'Name of the bucket to get ACL for',
	},
];

/**
 * Fields for Get Bucket Policy operation
 */
export const bucketGetPolicyFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getBucketPolicy'],
			},
		},
		default: '',
		placeholder: 'my-bucket',
		description: 'Name of the bucket to get policy for',
	},
];

/**
 * Fields for Put Bucket Policy operation
 */
export const bucketPutPolicyFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['putBucketPolicy'],
			},
		},
		default: '',
		placeholder: 'my-bucket',
		description: 'Name of the bucket to set policy on',
	},
	{
		displayName: 'Policy',
		name: 'policy',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['putBucketPolicy'],
			},
		},
		default: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Principal": "*",\n      "Action": "s3:GetObject",\n      "Resource": "arn:aws:s3:::BUCKET-NAME/*"\n    }\n  ]\n}',
		description: 'The bucket policy as a JSON object. Must be valid S3 bucket policy format.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
];

/**
 * Fields for Delete Bucket Policy operation
 */
export const bucketDeletePolicyFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['deleteBucketPolicy'],
			},
		},
		default: '',
		placeholder: 'my-bucket',
		description: 'Name of the bucket to remove policy from',
	},
];

// ============================================================================
// Object ACL Fields
// ============================================================================

/**
 * Fields for Get Object ACL operation
 */
export const objectGetAclFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getObjectAcl'],
			},
		},
		default: '',
		placeholder: 'my-bucket',
		description: 'Name of the bucket containing the object',
	},
	{
		displayName: 'Object Key',
		name: 'key',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getObjectAcl'],
			},
		},
		default: '',
		placeholder: 'path/to/file.pdf',
		description: 'Key (path/name) of the object to get ACL for',
	},
];

// ============================================================================
// IAM Policy Fields
// ============================================================================

/**
 * Fields for Get Policy operation
 */
export const iamGetPolicyFields: INodeProperties[] = [
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['getPolicy'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy to retrieve',
	},
];

/**
 * Fields for Get Policy Version operation
 */
export const iamGetPolicyVersionFields: INodeProperties[] = [
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['getPolicyVersion'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy',
	},
	{
		displayName: 'Version ID',
		name: 'versionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['getPolicyVersion'],
			},
		},
		default: '',
		placeholder: 'v1',
		description: 'The policy version to retrieve (e.g., v1, v2, v3)',
	},
];

/**
 * Fields for List Policies operation
 */
export const iamListPoliciesFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listPolicies'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listPolicies'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listPolicies'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'All',
						description: 'All policies',
					},
					{
						name: 'AWS',
						value: 'AWS',
						description: 'AWS managed policies only',
					},
					{
						name: 'Local',
						value: 'Local',
						description: 'Customer managed policies only',
					},
				],
				default: 'All',
				description: 'Filter policies by scope',
			},
			{
				displayName: 'Path Prefix',
				name: 'pathPrefix',
				type: 'string',
				default: '',
				placeholder: '/division_abc/',
				description: 'Filter policies by path prefix',
			},
		],
	},
];

/**
 * Fields for List Attached User Policies operation
 */
export const iamListAttachedUserPoliciesFields: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'userName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedUserPolicies'],
			},
		},
		default: '',
		placeholder: 'JohnDoe',
		description: 'Name of the IAM user to list attached policies for',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedUserPolicies'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedUserPolicies'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];

/**
 * Fields for List Attached Group Policies operation
 */
export const iamListAttachedGroupPoliciesFields: INodeProperties[] = [
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedGroupPolicies'],
			},
		},
		default: '',
		placeholder: 'Developers',
		description: 'Name of the IAM group to list attached policies for',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedGroupPolicies'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['listAttachedGroupPolicies'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];

/**
 * Fields for Attach User Policy operation
 */
export const iamAttachUserPolicyFields: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'userName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['attachUserPolicy'],
			},
		},
		default: '',
		placeholder: 'JohnDoe',
		description: 'Name of the IAM user to attach the policy to',
	},
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['attachUserPolicy'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy to attach',
	},
];

/**
 * Fields for Attach Group Policy operation
 */
export const iamAttachGroupPolicyFields: INodeProperties[] = [
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['attachGroupPolicy'],
			},
		},
		default: '',
		placeholder: 'Developers',
		description: 'Name of the IAM group to attach the policy to',
	},
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['attachGroupPolicy'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy to attach',
	},
];

/**
 * Fields for Detach User Policy operation
 */
export const iamDetachUserPolicyFields: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'userName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['detachUserPolicy'],
			},
		},
		default: '',
		placeholder: 'JohnDoe',
		description: 'Name of the IAM user to detach the policy from',
	},
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['detachUserPolicy'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy to detach',
	},
];

/**
 * Fields for Detach Group Policy operation
 */
export const iamDetachGroupPolicyFields: INodeProperties[] = [
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['detachGroupPolicy'],
			},
		},
		default: '',
		placeholder: 'Developers',
		description: 'Name of the IAM group to detach the policy from',
	},
	{
		displayName: 'Policy ARN',
		name: 'policyArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['iam'],
				operation: ['detachGroupPolicy'],
			},
		},
		default: '',
		placeholder: 'arn:aws:iam::123456789012:policy/MyPolicy',
		description: 'Amazon Resource Name (ARN) of the IAM policy to detach',
	},
];

// ============================================================================
// Export all fields
// ============================================================================

export const allMegaFields: INodeProperties[] = [
	// Bucket fields
	...bucketCreateFields,
	...bucketDeleteFields,
	...bucketHeadFields,
	...bucketGetLocationFields,
	...bucketGetAclFields,
	...bucketGetPolicyFields,
	...bucketPutPolicyFields,
	...bucketDeletePolicyFields,

	// Object fields
	...objectListFields,
	...objectPutFields,
	...objectGetFields,
	...objectDeleteFields,
	...objectDeleteMultipleFields,
	...objectHeadFields,
	...objectCopyFields,
	...objectGetPresignedUrlFields,
	...objectGetPresignedUploadUrlFields,
	...objectGetAclFields,

	// Multipart Upload fields
	...objectCreateMultipartUploadFields,
	...objectUploadPartFields,
	...objectCompleteMultipartUploadFields,
	...objectAbortMultipartUploadFields,
	...objectListPartsFields,
	...objectListMultipartUploadsFields,
	...objectUploadPartCopyFields,

	// IAM Policy fields
	...iamGetPolicyFields,
	...iamGetPolicyVersionFields,
	...iamListPoliciesFields,
	...iamListAttachedUserPoliciesFields,
	...iamListAttachedGroupPoliciesFields,
	...iamAttachUserPolicyFields,
	...iamAttachGroupPolicyFields,
	...iamDetachUserPolicyFields,
	...iamDetachGroupPolicyFields,
];
