# Label Module - Unit Tests Code Generation Plan

**Objective**: Create comprehensive unit tests for Label module (Repository, Service, Controller, DTOs)  
**Scope**: Test-only - no production code modifications  
**Target Test Framework**: Jest (already configured in project)

---

## Unit Test Generation Context

### Stories Implemented
- Test coverage for label template CRUD operations
- Test validation of business logic and error handling
- Test HTTP endpoint validation
- Test DTO input/output validation

### Dependencies
- Uses `LabelTemplateRepository` for data access
- Uses `LabelTemplate` Mongoose schema
- Uses `CreateLabelTemplateDto`, `UpdateLabelTemplateDto`, `GenerateLabelDto`, response DTOs
- Database: MongoDB with Mongoose

### Expected Artifacts
- `label-template.repository.spec.ts` - Repository unit tests
- `label-template.service.spec.ts` - Service unit tests
- `label-template.controller.spec.ts` - Controller unit tests
- `label-template.dto.spec.ts` - DTO validation tests

---

## Unit Test Generation Steps

### Step 1: Analyze Existing Implementation
- [x] Review `label-template.repository.ts` - identify all methods and database interactions
- [x] Review `label-template.service.ts` - identify business logic, error handling, data transformation
- [x] Review `label-template.controller.ts` - identify HTTP endpoints, validation, error responses
- [x] Review DTOs - identify validation rules, constraints, transformations
- [x] Document all exception paths (ConflictException, NotFoundException, BadRequestException)

### Step 2: Create Repository Unit Tests (`label-template.repository.spec.ts`)
- [x] Set up Mongoose mock using `@nest/mongoose` testing utilities
- [x] Test `create()` - successful creation, validation of persisted data
- [x] Test `findAll()` - pagination, sorting, data transformation
- [x] Test `findById()` - found scenario, not found scenario
- [x] Test `findByTemplateId()` - found with template_id, not found
- [x] Test `findByLabelType()` - filter by type, pagination
- [x] Test `search()` - regex search on template_id and template_name, pagination
- [x] Test `update()` - successful update, partial updates, not found scenario
- [x] Test `delete()` - successful deletion, not found scenario
- [x] Verify all database calls use correct MongoDB operators
- [x] Test error handling - database connection failures

### Step 3: Create Service Unit Tests (`label-template.service.spec.ts`)
- [x] Mock `LabelTemplateRepository` for all service methods
- [x] Test `create()` - successful creation, ConflictException for duplicate template_id
- [x] Test `findAll()` - pagination validation (page >= 1, limit >= 1, max limit 100)
- [x] Test `findById()` - successful retrieval, NotFoundException
- [x] Test `filterByType()` - filter by valid label type
- [x] Test `search()` - search functionality with pagination
- [x] Test `update()` - partial and full updates, NotFoundException
- [x] Test `delete()` - successful deletion, NotFoundException
- [x] Test `generateLabel()` with mock lot_id - uses MOCK_LOT_DATA
- [x] Test `generateLabel()` with mock batch_id - uses MOCK_BATCH_DATA
- [x] Test `generateLabel()` no lot/batch - defaults to MOCK_LOT_DATA
- [x] Test `generateLabel()` template not found - NotFoundException
- [x] Test template placeholder replacement - {{placeholder}} replacement with data
- [x] Test data transformation - toResponseDto, toPaginatedResponse
- [x] Test Decimal128 conversion (width, height) to number
- [x] Test logging behavior
- [x] Test pagination calculation (totalPages = Math.ceil(total / limit))

### Step 4: Create Controller Unit Tests (`label-template.controller.spec.ts`)
- [x] Mock `LabelTemplateService` for all controller methods
- [x] Test GET `/label-templates` - findAll with default pagination
- [x] Test GET `/label-templates?page=2&limit=10` - findAll with parameters
- [x] Test GET `/label-templates/search?q=query` - search endpoint, requires 'q' parameter
- [x] Test GET `/label-templates/search` (missing q param) - BadRequestException
- [x] Test GET `/label-templates/types` - returns all LabelTypeValues
- [x] Test GET `/label-templates/type/:type` - filterByType with valid type
- [x] Test GET `/label-templates/type/invalid-type` - invalid type throws BadRequestException
- [x] Test GET `/label-templates/:id` - findById endpoint
- [x] Test GET `/label-templates/:id` not found - NotFoundException propagated
- [x] Test POST `/label-templates` - create with valid DTO
- [x] Test POST `/label-templates` - ValidationPipe validates DTO constraints
- [x] Test POST `/label-templates/generate` - generateLabel endpoint
- [x] Test PUT `/label-templates/:id` - update with valid DTO, skipMissingProperties
- [x] Test DELETE `/label-templates/:id` - delete endpoint
- [x] Test HTTP status codes - 200 OK, 201 CREATED, correct error codes
- [x] Test ValidationPipe integration
- [x] Test ParseIntPipe for page and limit parameters

### Step 5: Create DTO Validation Tests (`label-template.dto.spec.ts`)
- [x] Test `CreateLabelTemplateDto` validation:
  - [x] template_id: required, string, max 20 chars
  - [x] template_name: required, string, max 100 chars
  - [x] label_type: required, enum validation (all 6 types)
  - [x] template_content: required, string
  - [x] width: required, number, min 0.01, max 99.99
  - [x] height: required, number, min 0.01, max 99.99
- [x] Test `UpdateLabelTemplateDto` validation:
  - [x] All fields optional
  - [x] template_name: string, max 100 (if provided)
  - [x] label_type: enum validation (if provided)
  - [x] width/height: number constraints (if provided)
- [x] Test `GenerateLabelDto` validation:
  - [x] template_id: required, string
  - [x] lot_id: optional, string
  - [x] batch_id: optional, string
- [x] Test invalid type enum values - rejection
- [x] Test numeric constraints - rejection of out-of-range values
- [x] Test string length constraints - rejection of oversized strings
- [x] Test Type transformation - ensure number conversion works

### Step 6: Set Up Test Fixtures and Mocks
- [x] Create reusable mock data factories for test cases
- [x] Create mock repository implementations
- [x] Create mock service implementations
- [x] Set up MongoDB mock using jest-mock-mongoose or similar
- [x] Create builder patterns for DTOs and documents
- [x] Document all mocks and fixtures

### Step 7: Ensure All Tests Pass
- [x] Run complete test suite: `npm run test:verbose`
- [x] Verify 100% coverage of service business logic
- [x] Verify all repository database calls are tested
- [x] Verify all controller endpoints and validations are tested
- [x] Verify all DTO validation rules are tested
- [x] Document any skipped tests with reasons

### Step 8: Document Test Implementation
- [x] Create test documentation in `aidlc-docs/construction/label-module/code/test-documentation.md`
- [x] Document test structure and organization
- [x] Document mock strategies used
- [x] Document coverage metrics
- [x] Document how to run tests and interpret results

---

## Mock Strategy

### Repository Mocking
- Use Jest mock for MongoDB Mongoose Model
- Mock methods: `save()`, `findById()`, `findOne()`, `find()`, `exec()`, `countDocuments()`, `findByIdAndUpdate()`, `findByIdAndDelete()`
- Simulate document responses with proper types (Decimal128 for numeric fields)

### Service Mocking
- Mock `LabelTemplateRepository` dependency via dependency injection
- Control repository method return values per test case

### Controller Mocking
- Mock `LabelTemplateService` dependency via dependency injection
- Mock ValidationPipe behavior if needed
- Test error propagation from service layer

### DTO Validation Mocking
- Use class-validator validation pipes directly
- Test plain object transformation and validation

---

## Test Data

### Sample LabelTemplate Document
```javascript
{
  _id: new ObjectId('507f1f77bcf86cd799439011'),
  template_id: 'RAW-001',
  template_name: 'Raw Material Label',
  label_type: 'Raw Material',
  template_content: 'Material: {{material_name}}\nExpires: {{expiration_date}}',
  width: Decimal128(4.5),
  height: Decimal128(6.0),
  created_date: new Date('2026-03-10T10:00:00Z'),
  modified_date: new Date('2026-03-10T10:00:00Z'),
}
```

### Label Type Enum Values
```javascript
['Raw Material', 'Sample', 'Intermediate', 'Finished Product', 'API', 'Status']
```

---

## Test Execution Plan

1. **Unit: Repository Layer** - Tests verify data persistence and retrieval
2. **Unit: Service Layer** - Tests verify business logic, validation, error handling
3. **Unit: Controller Layer** - Tests verify HTTP contract and validation
4. **Unit: DTO Layer** - Tests verify input/output validation

---

## Success Criteria

✅ All tests pass without modification to production code  
✅ Tests use mocks/stubs appropriately  
✅ Tests verify error handling and edge cases  
✅ 80%+ code coverage for service and repository layers  
✅ No skipped tests without documented reasons  
✅ Test file naming follows `.spec.ts` convention  
✅ Tests organized by component (repository, service, controller, dto)  

---

## Notes
- This plan focuses ONLY on unit testing
- No production code will be modified
- All tests must pass with existing implementation
- Mocks must accurately simulate Mongoose behavior including Decimal128 types
- Tests should verify both happy paths and error conditions
