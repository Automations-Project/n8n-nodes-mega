/**
 * Mega S4 Node - S3-compatible object storage
 * Main node class implementing INodeType interface
 */

import { INodeType, INodeTypeDescription, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';

import { megaOperations } from './operators';
import { allMegaFields } from './fields';
import { executeMega } from './execute';

export class Mega implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mega S4',
		name: 'mega',
		icon: 'file:mega.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Mega.nz S4 object storage (S3-compatible)',
		defaults: {
			name: 'Mega S4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'megaApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.customEndpoint || "https://s3." + $credentials.region + ".s4.mega.io"}}',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [...megaOperations, ...allMegaFields],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await executeMega.call(this);
	}
}
