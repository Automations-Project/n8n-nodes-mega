import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

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
			description: 'The AWS region for your Mega S4 service',
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
	 * Note on Credential Testing:
	 * 
	 * AWS Signature V4 authentication (used by Mega S4) is complex and requires
	 * the AWS SDK to properly sign requests. n8n's simple credential test mechanism
	 * (using ICredentialTestRequest with static headers) cannot handle this complexity.
	 * 
	 * Instead, credential validation happens when the node first executes an operation.
	 * If credentials are invalid, the AWS SDK will return clear error messages like:
	 * - "The AWS Access Key Id you provided does not exist in our records"
	 * - "SignatureDoesNotMatch: The request signature we calculated does not match"
	 * - "InvalidAccessKeyId: The Access Key ID provided does not exist"
	 * 
	 * This is the standard approach for S3-compatible services in n8n.
	 * The user will receive immediate, actionable feedback on their first operation attempt.
	 */
}
