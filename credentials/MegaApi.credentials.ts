import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { createHash, createHmac } from 'crypto';

/**
 * Mega S4 API Credentials
 * 
 * Uses AWS Signature Version 4 authentication for S3-compatible storage.
 */
export class MegaApi implements ICredentialType {
	name = 'megaApi';
	displayName = 'Mega S4 API';
	icon = 'file:mega.svg' as const;
	documentationUrl = 'https://mega.io/s4';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Mega S4 Access Key ID',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Mega S4 Secret Access Key',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'eu-central-1',
			description: 'The region for your Mega S4 service',
			options: [
				{
					name: 'EU Central 1 (Amsterdam)',
					value: 'eu-central-1',
				},
				{
					name: 'EU Central 2 (Luxembourg)',
					value: 'eu-central-2',
				},
				{
					name: 'CA Central 1 (Montreal)',
					value: 'ca-central-1',
				},
				{
					name: 'CA West 1 (Vancouver)',
					value: 'ca-west-1',
				},
			],
		},
		{
			displayName: 'Custom S3 Endpoint',
			name: 'customEndpoint',
			type: 'string',
			default: '',
			placeholder: 's3.eu-central-1.s4.mega.io',
			description: 'Optional: Override the default S3 endpoint. Leave empty to use region-based endpoint.',
		},
		{
			displayName: 'Force Path Style',
			name: 'forcePathStyle',
			type: 'boolean',
			default: true,
			description: 'Whether to force path-style URLs (bucket in path vs subdomain). Mega S4 typically requires this.',
		},
	];

	/**
	 * Authenticate requests using AWS Signature Version 4
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const accessKeyId = credentials.accessKeyId as string;
		const secretAccessKey = credentials.secretAccessKey as string;
		const region = (credentials.region as string) || 'eu-central-1';

		// Build full URL from baseURL and url
		const baseURL = requestOptions.baseURL || `https://s3.${region}.s4.mega.io`;
		const urlPath = requestOptions.url || '/';
		const fullUrl = urlPath.startsWith('http') ? urlPath : `${baseURL}${urlPath}`;
		
		// Parse URL
		const url = new URL(fullUrl);
		const host = url.host;

		// Generate timestamp
		const now = new Date();
		const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const dateStamp = amzDate.substring(0, 8);

		// Prepare headers
		const headers: Record<string, string> = {
			...(requestOptions.headers as Record<string, string> || {}),
			host,
			'x-amz-date': amzDate,
		};

		// Calculate content hash
		const body = requestOptions.body ? String(requestOptions.body) : '';
		const payloadHash = createHash('sha256').update(body).digest('hex');
		headers['x-amz-content-sha256'] = payloadHash;

		// Build canonical headers
		const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
		const canonicalHeaders = sortedHeaderKeys
			.map(key => `${key}:${headers[Object.keys(headers).find(k => k.toLowerCase() === key)!].trim()}`)
			.join('\n') + '\n';
		const signedHeaders = sortedHeaderKeys.join(';');

		// Build canonical request
		const method = requestOptions.method || 'GET';
		const canonicalUri = url.pathname;
		const canonicalQueryString = url.searchParams.toString();

		const canonicalRequest = [
			method,
			canonicalUri,
			canonicalQueryString,
			canonicalHeaders,
			signedHeaders,
			payloadHash,
		].join('\n');

		// Build string to sign
		const service = 's3';
		const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
		const stringToSign = [
			'AWS4-HMAC-SHA256',
			amzDate,
			credentialScope,
			createHash('sha256').update(canonicalRequest).digest('hex'),
		].join('\n');

		// Calculate signing key
		const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
		const kRegion = createHmac('sha256', kDate).update(region).digest();
		const kService = createHmac('sha256', kRegion).update(service).digest();
		const kSigning = createHmac('sha256', kService).update('aws4_request').digest();

		// Calculate signature
		const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

		// Build authorization header
		const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
		headers['authorization'] = authorization;

		requestOptions.headers = headers;
		return requestOptions;
	}

	/**
	 * Test the credentials by listing buckets
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{`https://s3.${$credentials.region}.s4.mega.io`}}',
			url: '/',
			method: 'GET',
		},
	};
}
