/**
 * Execution orchestrator for Mega S4 node
 * Routes operations to appropriate handlers and manages per-item execution
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import {
	handleListBuckets,
	handleCreateBucket,
	handleDeleteBucket,
	handleHeadBucket,
	handleGetBucketLocation,
	handleGetBucketAcl,
	handleGetBucketPolicy,
	handlePutBucketPolicy,
	handleDeleteBucketPolicy,
	handleListObjects,
	handlePutObject,
	handleGetObject,
	handleDeleteObject,
	handleDeleteMultipleObjects,
	handleHeadObject,
	handleCopyObject,
	handleGetPresignedUrl,
	handleGetPresignedUploadUrl,
	handleGetObjectAcl,
	handleCreateMultipartUpload,
	handleUploadPart,
	handleCompleteMultipartUpload,
	handleAbortMultipartUpload,
	handleListParts,
	handleListMultipartUploads,
	handleUploadPartCopy,
	handleGetPolicy,
	handleGetPolicyVersion,
	handleListPolicies,
	handleListAttachedUserPolicies,
	handleListAttachedGroupPolicies,
	handleAttachUserPolicy,
	handleAttachGroupPolicy,
	handleDetachUserPolicy,
	handleDetachGroupPolicy,
} from './methods';

/**
 * Main execution handler
 * Processes input items and delegates to appropriate operation handlers
 */
export async function executeMega(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	const returnData: INodeExecutionData[] = [];

	// ============================================================================
	// Bucket Operations (single execution, not per-item)
	// ============================================================================
	if (resource === 'bucket') {
		if (operation === 'list') {
			// List buckets - returns multiple items
			const results = await handleListBuckets.call(this, 0);
			returnData.push(...results);
		} else if (operation === 'create') {
			// Create bucket - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleCreateBucket.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'delete') {
			// Delete bucket - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDeleteBucket.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'head') {
			// Head bucket - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleHeadBucket.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
								exists: false,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getLocation') {
			// Get bucket location - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetBucketLocation.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getBucketAcl') {
			// Get bucket ACL - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetBucketAcl.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getBucketPolicy') {
			// Get bucket policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetBucketPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'putBucketPolicy') {
			// Put bucket policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handlePutBucketPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'deleteBucketPolicy') {
			// Delete bucket policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDeleteBucketPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation '${operation}' is not supported for resource 'bucket'`,
			);
		}
	}

	// ============================================================================
	// Object Operations (per-item execution)
	// ============================================================================
	else if (resource === 'object') {
		if (operation === 'list') {
			// List objects - can return multiple items per input item
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListObjects.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'put') {
			// Upload object - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handlePutObject.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'get') {
			// Download object - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetObject.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'delete') {
			// Delete object - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDeleteObject.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'deleteMultiple') {
			// Delete multiple objects - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDeleteMultipleObjects.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'head') {
			// Head object - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleHeadObject.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'copy') {
			// Copy object - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleCopyObject.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getPresignedUrl') {
			// Get presigned download URL - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetPresignedUrl.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getPresignedUploadUrl') {
			// Get presigned upload URL - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetPresignedUploadUrl.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getObjectAcl') {
			// Get object ACL - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetObjectAcl.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'createMultipartUpload') {
			// Create multipart upload - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleCreateMultipartUpload.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'uploadPart') {
			// Upload part - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleUploadPart.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'completeMultipartUpload') {
			// Complete multipart upload - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleCompleteMultipartUpload.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'abortMultipartUpload') {
			// Abort multipart upload - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleAbortMultipartUpload.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'listParts') {
			// List parts - per item (returns multiple items)
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListParts.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'listMultipartUploads') {
			// List multipart uploads - per item (returns multiple items)
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListMultipartUploads.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'uploadPartCopy') {
			// Upload part copy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleUploadPartCopy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation '${operation}' is not supported for resource 'object'`,
			);
		}
	}

	// ============================================================================
	// IAM Operations (per-item execution)
	// ============================================================================
	else if (resource === 'iam') {
		if (operation === 'getPolicy') {
			// Get policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'getPolicyVersion') {
			// Get policy version - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleGetPolicyVersion.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'listPolicies') {
			// List policies - per item (returns multiple items)
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListPolicies.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'listAttachedUserPolicies') {
			// List attached user policies - per item (returns multiple items)
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListAttachedUserPolicies.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'listAttachedGroupPolicies') {
			// List attached group policies - per item (returns multiple items)
			for (let i = 0; i < items.length; i++) {
				try {
					const results = await handleListAttachedGroupPolicies.call(this, i);
					returnData.push(...results);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'attachUserPolicy') {
			// Attach user policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleAttachUserPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'attachGroupPolicy') {
			// Attach group policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleAttachGroupPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'detachUserPolicy') {
			// Detach user policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDetachUserPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else if (operation === 'detachGroupPolicy') {
			// Detach group policy - per item
			for (let i = 0; i < items.length; i++) {
				try {
					const result = await handleDetachGroupPolicy.call(this, i);
					returnData.push(result);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								itemIndex: i,
							},
							pairedItem: { item: i },
						});
					} else {
						throw error;
					}
				}
			}
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation '${operation}' is not supported for resource 'iam'`,
			);
		}
	}

	// ============================================================================
	// Unknown Resource
	// ============================================================================
	else {
		throw new NodeOperationError(
			this.getNode(),
			`The resource '${resource}' is not recognized. Supported resources: bucket, object, iam`,
		);
	}

	return [returnData];
}
