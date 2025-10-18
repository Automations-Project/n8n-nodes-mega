![n8n.io - Workflow Automation](/intro.png)
# Mega n8n Node
[![CI](https://github.com/Automations-Project/n8n-nodes-mega/actions/workflows/ci.yml/badge.svg)](https://github.com/Automations-Project/n8n-nodes-mega/actions/workflows/ci.yml)

[![n8n community node](https://img.shields.io/badge/n8n-community%20node-orange)](https://docs.n8n.io/integrations/community-nodes/)
[![S3 compatible](https://img.shields.io/badge/S3-compatible-569A31)](https://docs.aws.amazon.com/AmazonS3/latest/API/)
[![Mega S4](https://img.shields.io/badge/Mega-S4-d9272e)](https://mega.io/s4)
[![n8n Nodes API](https://img.shields.io/badge/n8n%20Nodes%20API-v1-blue)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![npm version](https://img.shields.io/npm/v/n8n-nodes-mega?logo=npm)](https://www.npmjs.com/package/n8n-nodes-mega)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-mega?logo=npm)](https://www.npmjs.com/package/n8n-nodes-mega)
[![n8n Node version](https://img.shields.io/github/package-json/v/Automations-Project/n8n-nodes-mega?logo=n8n&label=n8n%20node)](https://github.com/Automations-Project/n8n-nodes-mega)
[![n8n compatibility](https://img.shields.io/github/v/release/n8n-io/n8n?logo=n8n&label=)](https://n8n.io)
[![Node.js compatibility](https://img.shields.io/badge/Node.js-%E2%89%A518.17.0-green?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-blue?logo=typescript)](https://www.typescriptlang.org)
[![Dependencies](https://img.shields.io/librariesio/release/npm/n8n-nodes-mega?logo=dependabot)](https://libraries.io/npm/n8n-nodes-mega)
[![License](https://img.shields.io/github/license/Automations-Project/n8n-nodes-mega)](LICENSE.md)

[![GitHub stars](https://img.shields.io/github/stars/Automations-Project/n8n-nodes-mega?style=social)](https://github.com/Automations-Project/n8n-nodes-mega/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Automations-Project/n8n-nodes-mega?style=social)](https://github.com/Automations-Project/n8n-nodes-mega/network)
[![GitHub issues](https://img.shields.io/github/issues/Automations-Project/n8n-nodes-mega)](https://github.com/Automations-Project/n8n-nodes-mega/issues)
[![Last commit](https://img.shields.io/github/last-commit/Automations-Project/n8n-nodes-mega)](https://github.com/Automations-Project/n8n-nodes-mega/commits)

This is an n8n community node for **Mega.nz S4** object storage service. It provides S3-compatible operations for managing buckets and objects in your Mega S4 account.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform where you can host and automate your workflows locally or on cloud.

## Features

### 🪣 Bucket Operations
- **List Buckets** - Get all buckets in your account
- **Create Bucket** - Create new storage buckets
- **Delete Bucket** - Remove empty buckets
- **Head Bucket** - Check if bucket exists and is accessible
- **Get Location** - Retrieve the region where a bucket is located

### 📦 Object Operations
- **List Objects** - Browse objects in a bucket with pagination support
- **Upload Object** - Upload files or text data to buckets
- **Download Object** - Retrieve objects as binary data
- **Delete Object** - Remove single objects
- **Delete Multiple** - Batch delete multiple objects
- **Head Object** - Get object metadata without downloading
- **Copy Object** - Copy objects between buckets or within the same bucket

### ✨ Advanced Features
- ✅ AWS SDK v3 for reliable S3-compatible operations
- ✅ Multiple region support (Amsterdam, Luxembourg, Montreal, Vancouver)
- ✅ Binary data handling for file uploads/downloads
- ✅ Pagination for large object lists
- ✅ Input validation (bucket names, object keys)
- ✅ Custom metadata support
- ✅ Read-only ACL operations (GetBucketAcl, GetObjectAcl)
- ✅ Bucket policy management for access control
- ℹ️ All objects use STANDARD storage class (Mega S4 default)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.
### npm
```bash
npm install n8n-nodes-mega
```

### n8n Cloud & Self-Hosted
You can install community nodes directly in n8n Cloud through the **Settings → Community Nodes** menu.

## Credentials

To use this node, you need Mega S4 API credentials:

1. Log in to your Mega account
2. Navigate to S4 settings (**FM → Object storage → Keys**)
3. Generate or locate your:
   - **Access Key ID**
   - **Secret Access Key**
4. Select your preferred region:
   - `eu-central-1` - Amsterdam (default)
   - `eu-central-2` - Luxembourg
   - `ca-central-1` - Montreal
   - `ca-west-1` - Vancouver

### Configuration

In n8n, go to **Credentials → New → Mega S4 API** and enter:

| Field | Required | Description                                         |
|-------|----------|-----------------------------------------------------|
| Access Key ID | Yes | Your Mega S4 access key                             |
| Secret Access Key | Yes | Your Mega S4 secret key                             |
| Region | Yes | The region for your S4 service                      |
| Custom S3 Endpoint | No | Override default endpoint (advanced)                |
| Force Path Style | No | Use path-style URLs (default: true, for mega users) |

## Usage

### Example 1: List All Buckets

1. Add the **Mega S4** node to your workflow
2. Connect your credentials
3. Select:
   - **Resource**: Bucket
   - **Operation**: List
4. Execute the node

Returns an array of all buckets with names and creation dates.

### Example 2: Upload a File

1. Add the **Mega S4** node after a node that outputs binary data (e.g., HTTP Request, Read Binary File)
2. Configure:
   - **Resource**: Object
   - **Operation**: Upload
   - **Bucket Name**: `my-bucket`
   - **Object Key**: `folder/myfile.pdf`
   - **Binary Data**: `true`
   - **Binary Property**: `data` (default)
3. Execute the node

The file will be uploaded to the specified bucket and path.

### Example 3: Download a File

1. Add the **Mega S4** node to your workflow
2. Configure:
   - **Resource**: Object
   - **Operation**: Download
   - **Bucket Name**: `my-bucket`
   - **Object Key**: `folder/myfile.pdf`
   - **Binary Property**: `data` (output property name)
3. Execute the node

The file will be downloaded and available as binary data for the next node.

### Example 4: List Objects with Prefix Filter

1. Add the **Mega S4** node
2. Configure:
   - **Resource**: Object
   - **Operation**: List
   - **Bucket Name**: `my-bucket`
   - **Return All**: `false`
   - **Limit**: `50`
   - **Additional Fields** → **Prefix**: `documents/2024/`
3. Execute the node

Returns up to 50 objects that start with `documents/2024/`.

### Example 5: Copy Object Between Buckets

1. Add the **Mega S4** node
2. Configure:
   - **Resource**: Object
   - **Operation**: Copy
   - **Source Bucket**: `source-bucket`
   - **Source Object Key**: `old-location/file.txt`
   - **Destination Bucket**: `destination-bucket`
   - **Destination Object Key**: `new-location/file.txt`
3. Execute the node

The object will be copied to the new location.

## Operations Reference

### Bucket Operations

#### List
Lists all buckets in your Mega S4 account. No parameters required.

**Returns**: Array of buckets with `name` and `creationDate`.

#### Create
Creates a new bucket.

**Parameters**:
- `bucketName` (required): Unique bucket name (3-63 characters, lowercase, no spaces)

**Note**: Access control is managed via bucket policies, not ACLs.

#### Delete
Deletes an empty bucket.

**Parameters**:
- `bucketName` (required): Name of the bucket to delete

**Note**: Bucket must be empty. Use "Delete Multiple Objects" first if needed.

#### Head
Checks if a bucket exists and is accessible.

**Parameters**:
- `bucketName` (required): Name of the bucket to check

**Returns**: `exists: true` if accessible, error if not found or no permission.

#### Get Location
Gets the region where a bucket is located.

**Parameters**:
- `bucketName` (required): Name of the bucket

**Returns**: `region` (e.g., `eu-central-1`)

### Object Operations

#### List
Lists objects in a bucket with pagination support.

**Parameters**:
- `bucketName` (required): Name of the bucket
- `returnAll` (optional): Return all objects or limit results
- `limit` (optional): Max number of objects to return (default: 50)
- `prefix` (optional): Filter objects by prefix (e.g., `folder/`)
- `delimiter` (optional): Group keys (e.g., `/` for folder simulation)
- `startAfter` (optional): Start listing after this key

**Returns**: Array of objects with `key`, `size`, `lastModified`, `etag`, etc.

#### Upload
Uploads a file or text data to a bucket.

**Parameters**:
- `bucketName` (required): Destination bucket
- `objectKey` (required): Path/name for the object (e.g., `folder/file.txt`)
- `binaryData` (optional): Upload binary data (true) or text (false)
- `binaryPropertyName` (required if binary): Property containing file data
- `textData` (required if not binary): Text content to upload
- `contentType` (optional): MIME type (e.g., `image/png`)
- `metadata` (optional): Custom key-value metadata

**Returns**: `success`, `etag`, `size`, etc.

**Note**: All objects automatically use STANDARD storage class. Access control is managed via bucket policies.

#### Download
Downloads an object from a bucket.

**Parameters**:
- `bucketName` (required): Source bucket
- `objectKey` (required): Path/name of the object
- `binaryPropertyName` (optional): Output property name (default: `data`)

**Returns**: Object metadata in JSON + binary data in specified property.

#### Delete
Deletes a single object.

**Parameters**:
- `bucketName` (required): Bucket containing the object
- `objectKey` (required): Path/name of the object to delete

**Returns**: `success`, `deleteMarker`, `versionId`

#### Delete Multiple
Deletes multiple objects in one operation (batch delete).

**Parameters**:
- `bucketName` (required): Bucket containing the objects
- `objectKeys` (required): Comma-separated list of object keys
- `quiet` (optional): Only return errors, not successful deletions

**Returns**: Arrays of `deleted` and `errors` with counts.

#### Head
Gets object metadata without downloading the object.

**Parameters**:
- `bucketName` (required): Bucket containing the object
- `objectKey` (required): Path/name of the object

**Returns**: `contentType`, `size`, `etag`, `lastModified`, `metadata`, etc.

#### Copy
Copies an object to a new location.

**Parameters**:
- `sourceBucket` (required): Source bucket
- `sourceKey` (required): Source object path/name
- `destinationBucket` (required): Destination bucket (can be same as source)
- `destinationKey` (required): Destination path/name
- `metadataDirective` (optional): `COPY` (keep source metadata) or `REPLACE`

**Returns**: `success`, `etag`, `lastModified`

## Mega S4 API Limitations

Mega S4 is S3-compatible but does not support all AWS S3 features. This node avoids unsupported features and provides alternatives where applicable.

| Feature | Status | Alternative |
|---------|--------|-------------|
| ACL (write operations) | Not supported | Use Bucket Policies |
| Storage class selection | Not supported | Automatic STANDARD |
| Server-side encryption | Not supported | Client-side encryption |
| Object lock/retention | Not supported | N/A |
| Versioning | Not supported | N/A |
| Location constraint | Not supported | Configure via endpoint/region |
| Checksum algorithm | Not supported | Use ETags |
| Presigned POST | Not supported | Use Presigned PUT |
| x-amz-grant-* headers | Not supported | Use Bucket Policies |

**Supported access control**
- GetBucketAcl, GetObjectAcl (read-only)
- Bucket policies: GetBucketPolicy, PutBucketPolicy, DeleteBucketPolicy

See the full list: [Mega S4 API Limitations](MEGA_S4_UNSUPPORTED_OPERATIONS.md)

## Validation & Error Handling

The node performs comprehensive validation:

### Bucket Names
- Must be 3-63 characters long
- Lowercase letters, numbers, hyphens, and dots only
- Must start and end with a letter or number
- Cannot be formatted as an IP address

### Object Keys
- Must not be empty
- Cannot exceed 1024 characters
- Cannot contain consecutive slashes (`//`)

### Error Messages
Errors include:
- **Validation errors**: Clear explanation of what's wrong with input
- **S3 API errors**: HTTP status codes and S3 error codes
- **Network errors**: Connection issues, timeouts
- **Permission errors**: Access denied messages

All errors include the item index for multi-item operations.

## Technical Details

### Built With
- **n8n-workflow**: Node execution framework
- **AWS SDK v3**: `@aws-sdk/client-s3` for S3-compatible operations
- **TypeScript**: Strict typing for reliability

### Architecture
The node is built with a modular architecture:
- `Mega.node.ts` - Main node class
- `operators.ts` - Resource and operation definitions
- `fields.ts` - Parameter definitions
- `methods.ts` - Operation handler implementations
- `execute.ts` - Execution orchestrator
- `interfaces.ts` - TypeScript interfaces
- `GenericFunctions.ts` - S3 client and helper functions

### S3 Compatibility
Mega S4 is S3-compatible and uses AWS Signature Version 4 authentication. This node leverages the official AWS SDK v3, ensuring compatibility and reliability.

## Development

### Prerequisites
- Node.js >= 18.17.0
- npm or pnpm
- n8n instance for testing

### Setup
```bash
# Clone the repository
git clone https://github.com/Automations-Project/n8n-nodes-mega.git
cd n8n-nodes-mega

# Install dependencies
npm install

# Build the node
npm run build

# Lint and format
npm run lint
npm run format
```

### Local Testing
```bash
# Build and install to local n8n (Windows)
npm run start:dev-windows

# Watch mode for development
npm run dev
```

### Project Structure
```
n8n-nodes-mega/
├── credentials/
│   ├── MegaApi.credentials.ts
│   └── mega.svg
├── nodes/
│   └── Mega/
│       ├── Mega.node.ts
│       ├── Mega.node.json
│       ├── mega.svg
│       ├── operators.ts
│       ├── fields.ts
│       ├── methods.ts
│       ├── execute.ts
│       ├── interfaces.ts
│       └── GenericFunctions.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### "Invalid bucket name" error
Ensure your bucket name follows S3 naming rules:
- 3-63 characters
- Lowercase only
- No spaces, underscores, or special characters (except hyphens and dots)

### "Access Denied" error
1. Verify your Access Key ID and Secret Access Key are correct
2. Check that your Mega S4 account has permissions for the operation
3. Ensure the bucket/object exists in the selected region

### "Bucket not found" error
1. Confirm the bucket name is spelled correctly (case-sensitive)
2. Check if the bucket is in the selected region
3. Try using the "Head Bucket" operation to test access

### Binary data not uploading
1. Ensure the previous node outputs binary data
2. Check that `binaryPropertyName` matches the property name from the previous node
3. Verify the binary data property exists in the input

### Region-specific issues
If operations fail:
1. Try using a custom endpoint in credentials
2. Verify the region in your Mega S4 account settings
3. Check Mega's status page for service availability

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

[MIT](LICENSE.md)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Mega S4 Documentation](https://mega.io/s4)
- [AWS S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/)

## Support

- **n8n Community Forum**: [community.n8n.io](https://n8n.community?ref=nskha)
- **Issues**: [GitHub Issues](https://github.com/Automations-Project/n8n-nodes-mega/issues)
- **Mega Support**: [mega.io/help](https://mega.io/help)

**VibeCoded with ❤️ for the n8n & Mega community**
