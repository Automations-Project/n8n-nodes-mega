# Tests

This directory contains unit and integration tests for the Mega S4 n8n node.

## Structure

- `GenericFunctions.test.ts` - Tests for validation helpers and utility functions
- **TODO**: `methods.test.ts` - Tests for operation handlers in `nodes/Mega/methods.ts`
- **TODO**: `execute.test.ts` - Integration-style tests for node execution orchestration

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Coverage Thresholds

The project enforces ≥80% coverage for:
- Branches
- Functions
- Lines
- Statements

## Writing Tests

### Unit Tests for Operation Handlers

Each handler in `methods.ts` should have tests covering:

1. **Happy path** - successful execution with valid inputs
2. **Validation errors** - invalid bucket names, object keys, etc.
3. **API errors** - mocked AWS SDK errors (NoSuchBucket, AccessDenied, etc.)
4. **Edge cases** - empty results, pagination, etc.

Example structure:

```typescript
import { handleListBuckets } from '../nodes/Mega/methods';
import { IExecuteFunctions } from 'n8n-workflow';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('handleListBuckets', () => {
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    // Setup mocks
  });

  it('should list all buckets successfully', async () => {
    // Test implementation
  });

  it('should handle AWS API errors gracefully', async () => {
    // Test error handling
  });
});
```

### Mocking AWS SDK

Use Jest to mock AWS SDK v3 commands:

```typescript
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3');

const mockSend = jest.fn();
(S3Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));
```

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Mock external calls** - Never make real AWS API calls in tests
3. **Test error paths** - Ensure error handling works correctly
4. **Use descriptive names** - Test names should clearly state what is being tested
5. **Follow AAA pattern** - Arrange, Act, Assert

## TODO

- [ ] Add tests for all operation handlers in `methods.ts`
- [ ] Add integration tests for `execute.ts` orchestration logic
- [ ] Add tests for credential validation
- [ ] Achieve ≥80% code coverage across all modules
