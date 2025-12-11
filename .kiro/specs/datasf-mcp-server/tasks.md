# Implementation Plan

- [x] 1. Initialize project structure and dependencies





  - Create package.json with TypeScript, @modelcontextprotocol/sdk, axios, zod, fuse.js, fast-check
  - Set up tsconfig.json for ES modules with strict mode
  - Create src directory structure: index.ts, socrataClient.ts, validator.ts, fuzzyMatcher.ts, cache.ts
  - _Requirements: 6.1_

- [x] 2. Implement input validation






  - [x] 2.1 Create validator module with Zod schemas

    - Implement DatasetIdSchema with regex pattern `^[a-z0-9]{4}-[a-z0-9]{4}$`
    - Implement SearchQuerySchema (non-empty, max 500 chars)
    - Implement SoqlQuerySchema (non-empty, max 4000 chars)
    - Export validateDatasetId, validateSearchQuery, validateSoqlQuery functions
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 2.2 Write property tests for validation
    - **Property 4: Invalid 4x4 IDs are rejected by validation**
    - **Validates: Requirements 2.2, 7.1**
  - [ ]* 2.3 Write property test for search query validation
    - **Property 14: Search query length validation**
    - **Validates: Requirements 7.2**
  - [ ]* 2.4 Write property test for SoQL query validation
    - **Property 15: SoQL query length validation**
    - **Validates: Requirements 7.3**
  - [ ]* 2.5 Write property test for validation error messages
    - **Property 16: Validation errors are descriptive**
    - **Validates: Requirements 7.4**

- [x] 3. Implement schema cache






  - [x] 3.1 Create cache module with Map-based storage

    - Implement SchemaCache class with get, set, has, clear methods
    - Add TTL support (default 5 minutes)
    - Store timestamp with each entry for expiration
    - _Requirements: 2.4_
  - [ ]* 3.2 Write property test for cache
    - **Property 5: Schema caching preserves data**
    - **Validates: Requirements 2.4**

- [x] 4. Implement fuzzy matcher




  - [x] 4.1 Create fuzzy matcher module using Fuse.js


    - Implement FuzzyMatcher class with configurable threshold (default 0.4)
    - Implement correctColumns method for field name correction
    - Implement correctSoqlQuery method to parse and correct column names in SoQL
    - Return CorrectionResult array with original, corrected, wasChanged fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 4.2 Write property test for fuzzy matching
    - **Property 8: Fuzzy matching corrects close matches**
    - **Validates: Requirements 4.1**
  - [ ]* 4.3 Write property test for correction reporting
    - **Property 9: Corrections are reported in metadata**
    - **Validates: Requirements 4.2, 4.4**
  - [ ]* 4.4 Write property test for non-matching passthrough
    - **Property 10: Non-matching fields pass through unchanged**
    - **Validates: Requirements 4.3**


- [x] 5. Implement Socrata client




  - [x] 5.1 Create SocrataClient class with HTTP methods


    - Read SOCRATA_APP_TOKEN from environment
    - Implement getHeaders method to inject X-App-Token when available
    - Configure axios with 30 second timeout
    - _Requirements: 5.1, 5.2, 3.5_
  - [x] 5.2 Implement searchDatasets method

    - Call Discovery API at api.us.socrata.com/api/catalog/v1
    - Filter by domains=data.sfgov.org
    - Map response to DatasetSearchResult array (id, name, description)
    - _Requirements: 1.1, 1.2_
  - [x] 5.3 Implement listDatasets method

    - Call Discovery API with category filter when provided
    - Sort by recently updated or popularity
    - Include category in response
    - _Requirements: 1B.1, 1B.2, 1B.3_
  - [x] 5.4 Implement getSchema method

    - Call Views API at data.sfgov.org/api/views/{id}.json
    - Extract columns with name, fieldName, dataType
    - Integrate with SchemaCache for caching
    - _Requirements: 2.1, 2.4_
  - [x] 5.5 Implement queryResource method

    - Call Resource API at data.sfgov.org/resource/{id}.json
    - Pass SoQL via $query parameter
    - Handle result truncation for large responses
    - _Requirements: 3.1, 3.3_
  - [ ]* 5.6 Write property test for token in headers
    - **Property 11: App Token included in headers when configured**
    - **Validates: Requirements 5.1**
  - [ ]* 5.7 Write property test for token security
    - **Property 12: App Token never exposed in responses**
    - **Validates: Requirements 5.4**


- [-] 6. Implement error handling

  - [x] 6.1 Create error handler utility



    - Implement handleApiCall wrapper function
    - Classify errors by type: validation, not_found, rate_limit, timeout, api_error
    - Extract Socrata error messages for LLM self-correction
    - _Requirements: 1.4, 2.3, 3.2, 3.4, 3.5_
  - [ ]* 6.2 Write unit tests for error classification
    - Test 404 → not_found mapping
    - Test 429 → rate_limit mapping
    - Test timeout detection
    - _Requirements: 2.3, 3.2, 3.4, 3.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement MCP server





  - [x] 8.1 Create MCP server with tool registration


    - Initialize Server with name "datasf-mcp" and version
    - Set up StdioServerTransport
    - Register ListToolsRequestSchema handler with all 4 tools
    - Define JSON schemas using zod-to-json-schema
    - _Requirements: 6.1, 6.2_
  - [x] 8.2 Implement search_datasf tool handler


    - Validate input with SearchQuerySchema
    - Call socrataClient.searchDatasets
    - Format response as MCP content
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 8.3 Implement list_datasf tool handler


    - Validate optional category input
    - Call socrataClient.listDatasets
    - Format response as MCP content
    - _Requirements: 1B.1, 1B.2, 1B.3_
  - [x] 8.4 Implement get_schema tool handler


    - Validate dataset_id with DatasetIdSchema
    - Call socrataClient.getSchema (uses cache)
    - Format response with columns and cached indicator
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 8.5 Implement query_datasf tool handler


    - Validate dataset_id and soql inputs
    - Optionally apply fuzzy correction to SoQL
    - Call socrataClient.queryResource
    - Include corrections in response metadata
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
  - [x] 8.6 Implement unknown tool error handling

    - Return standardized error for unrecognized tool names
    - _Requirements: 6.4_
  - [x] 8.7 Write property tests for response format



    - **Property 1: Search results contain required fields**
    - **Validates: Requirements 1.1**
  - [x] 8.8 Write property test for result limiting



    - **Property 2: Search results respect configured limit**
    - **Validates: Requirements 1.2**

  - [ ]* 8.9 Write property test for schema response
    - **Property 3: Schema response contains complete column information**

    - **Validates: Requirements 2.1**
  - [ ]* 8.10 Write property test for query results
    - **Property 6: Query results are valid JSON arrays**
    - **Validates: Requirements 3.1**

  - [ ]* 8.11 Write property test for truncation
    - **Property 7: Large results are truncated with indicator**
    - **Validates: Requirements 3.3**
  - [ ]* 8.12 Write property test for MCP content format
    - **Property 13: MCP responses have correct content format**
    - **Validates: Requirements 6.3**

- [x] 9. Final integration and build




  - [x] 9.1 Wire all components together in index.ts


    - Import and instantiate all modules
    - Connect server to transport
    - Add startup logging
    - _Requirements: 6.1_
  - [x] 9.2 Add build scripts to package.json


    - Add "build" script for TypeScript compilation
    - Add "start" script to run compiled server
    - Add "test" script for running all tests
    - _Requirements: 6.1_
  - [ ]* 9.3 Write integration test with real Socrata API
    - Test search with known query
    - Test schema retrieval for known dataset
    - Test simple query execution
    - _Requirements: 1.1, 2.1, 3.1_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
