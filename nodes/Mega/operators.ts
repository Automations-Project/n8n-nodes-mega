/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
/**
 * Resource and Operation definitions for Mega S4 node
 * Following n8n declarative style conventions
 */

import { INodeProperties } from 'n8n-workflow';

export const megaOperations: INodeProperties[] = [
	// Resource selector
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Bucket',
				value: 'bucket',
				description: 'Perform operations on S3 buckets',
			},
			{
				name: 'IAM',
				value: 'iam',
				description: 'Perform IAM policy management operations',
			},
			{
				name: 'Object',
				value: 'object',
				description: 'Perform operations on S3 objects (files)',
			},
		],
		default: 'bucket',
	},

	// ============================================================================
	// Bucket Operations
	// ============================================================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bucket',
				action: 'Create a bucket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an empty bucket',
				action: 'Delete a bucket',
			},
			{
				name: 'Delete Policy',
				value: 'deleteBucketPolicy',
				description: 'Remove the policy from a bucket',
				action: 'Delete bucket policy',
			},
			{
				name: 'Get ACL',
				value: 'getBucketAcl',
				description: 'Get the Access Control List (ACL) for a bucket',
				action: 'Get bucket ACL',
			},
			{
				name: 'Get Location',
				value: 'getLocation',
				description: 'Get the region where a bucket is located',
				action: 'Get bucket location',
			},
			{
				name: 'Get Policy',
				value: 'getBucketPolicy',
				description: 'Retrieve the policy of a bucket',
				action: 'Get bucket policy',
			},
			{
				name: 'Head',
				value: 'head',
				description: 'Check if a bucket exists and you have access to it',
				action: 'Check bucket existence',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all buckets',
				action: 'List all buckets',
			},
			{
				name: 'Put Policy',
				value: 'putBucketPolicy',
				description: 'Add or replace a policy on a bucket',
				action: 'Put bucket policy',
			},
		],
		default: 'list',
	},

	// ============================================================================
	// Object Operations
	// ============================================================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
		options: [
			{
				name: 'Abort Multipart Upload',
				value: 'abortMultipartUpload',
				description: 'Cancel an incomplete multipart upload',
				action: 'Abort multipart upload',
			},
			{
				name: 'Complete Multipart Upload',
				value: 'completeMultipartUpload',
				description: 'Finalize a multipart upload by combining all parts',
				action: 'Complete multipart upload',
			},
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy an object from one location to another',
				action: 'Copy an object',
			},
			{
				name: 'Create Multipart Upload',
				value: 'createMultipartUpload',
				description: 'Initiate a multipart upload for large files',
				action: 'Create multipart upload',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a single object',
				action: 'Delete an object',
			},
			{
				name: 'Delete Multiple',
				value: 'deleteMultiple',
				description: 'Delete multiple objects at once',
				action: 'Delete multiple objects',
			},
			{
				name: 'Download',
				value: 'get',
				description: 'Download an object (file)',
				action: 'Download an object',
			},
			{
				name: 'Get Presigned URL',
				value: 'getPresignedUrl',
				description: 'Generate a temporary URL for downloading an object',
				action: 'Get presigned download URL',
			},
			{
				name: 'Get ACL',
				value: 'getObjectAcl',
				description: 'Get the Access Control List (ACL) for an object',
				action: 'Get object ACL',
			},
			{
				name: 'Get Presigned Upload URL',
				value: 'getPresignedUploadUrl',
				description: 'Generate a temporary URL for uploading an object',
				action: 'Get presigned upload URL',
			},
			{
				name: 'Head',
				value: 'head',
				description: 'Get object metadata without downloading the object',
				action: 'Get object metadata',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List objects in a bucket',
				action: 'List objects',
			},
			{
				name: 'List Multipart Uploads',
				value: 'listMultipartUploads',
				description: 'List all ongoing multipart uploads in a bucket',
				action: 'List multipart uploads',
			},
			{
				name: 'List Parts',
				value: 'listParts',
				description: 'List parts of a specific multipart upload',
				action: 'List upload parts',
			},
			{
				name: 'Upload',
				value: 'put',
				description: 'Upload an object (file) to a bucket',
				action: 'Upload an object',
			},
			{
				name: 'Upload Part',
				value: 'uploadPart',
				description: 'Upload a part (chunk) in a multipart upload',
				action: 'Upload part',
			},
			{
				name: 'Upload Part Copy',
				value: 'uploadPartCopy',
				description: 'Copy data from an existing object as a part in a multipart upload',
				action: 'Upload part from copy',
			},
		],
		default: 'list',
	},

	// ============================================================================
	// IAM Operations
	// ============================================================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['iam'],
			},
		},
		options: [
			{
				name: 'Attach Group Policy',
				value: 'attachGroupPolicy',
				description: 'Attach an IAM policy to a group',
				action: 'Attach policy to group',
			},
			{
				name: 'Attach User Policy',
				value: 'attachUserPolicy',
				description: 'Attach an IAM policy to a user',
				action: 'Attach policy to user',
			},
			{
				name: 'Detach Group Policy',
				value: 'detachGroupPolicy',
				description: 'Detach an IAM policy from a group',
				action: 'Detach policy from group',
			},
			{
				name: 'Detach User Policy',
				value: 'detachUserPolicy',
				description: 'Detach an IAM policy from a user',
				action: 'Detach policy from user',
			},
			{
				name: 'Get Policy',
				value: 'getPolicy',
				description: 'Retrieve details about an IAM policy',
				action: 'Get policy details',
			},
			{
				name: 'Get Policy Version',
				value: 'getPolicyVersion',
				description: 'Retrieve information about a specific policy version',
				action: 'Get policy version',
			},
			{
				name: 'List Attached Group Policies',
				value: 'listAttachedGroupPolicies',
				description: 'List all IAM policies attached to a group',
				action: 'List group policies',
			},
			{
				name: 'List Attached User Policies',
				value: 'listAttachedUserPolicies',
				description: 'List all IAM policies attached to a user',
				action: 'List user policies',
			},
			{
				name: 'List Policies',
				value: 'listPolicies',
				description: 'List all IAM policies in the account',
				action: 'List all policies',
			},
		],
		default: 'listPolicies',
	},
];
