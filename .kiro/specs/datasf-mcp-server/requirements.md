# Requirements Document

## Introduction

This document specifies the requirements for a Model Context Protocol (MCP) server that enables Large Language Models (LLMs) to interact with San Francisco's open data portal (DataSF) powered by the Socrata platform. The server will provide tools for searching datasets, retrieving schema information, and executing SoQL (Socrata Query Language) queries against public datasets.

## Glossary

- **MCP (Model Context Protocol)**: A protocol that allows LLMs to interact with external tools and data sources through a standardized interface.
- **DataSF**: San Francisco's open data portal hosted at data.sfgov.org.
- **Socrata**: The platform that powers DataSF, providing APIs for data access.
- **SoQL (Socrata Query Language)**: A SQL-like query language used to query Socrata datasets.
- **4x4 ID**: A unique 9-character identifier for Socrata datasets in the format `xxxx-xxxx` (e.g., `wg3w-h783`).
- **App Token**: An authentication token from Socrata that increases rate limits for API requests.
- **Dataset**: A structured collection of data records available through DataSF.
- **Schema**: The structure of a dataset including column names, field names, and data types.
- **Field Name**: The API-compatible column identifier used in SoQL queries (e.g., `incident_date`).
- **Column Name**: The human-readable display name for a column (e.g., "Incident Date").

## Requirements

### Requirement 1: Dataset Search

**User Story:** As an LLM user, I want to search for datasets by keywords, so that I can discover relevant data sources for my queries.

#### Acceptance Criteria

1. WHEN a user provides search keywords THEN the DataSF_MCP_Server SHALL return a list of matching datasets with their 4x4 IDs, names, and descriptions.
2. WHEN search results are returned THEN the DataSF_MCP_Server SHALL limit results to a configurable maximum (default 5) to prevent response overflow.
3. WHEN no datasets match the search query THEN the DataSF_MCP_Server SHALL return an empty list with a clear indication that no results were found.
4. WHEN the Socrata Discovery API returns an error THEN the DataSF_MCP_Server SHALL return a descriptive error message to the LLM.

### Requirement 1B: Dataset Browsing

**User Story:** As an LLM user, I want to browse available datasets by category, so that I can discover data sources when I don't have specific keywords.

#### Acceptance Criteria

1. WHEN a user requests to list datasets without a search query THEN the DataSF_MCP_Server SHALL return popular or recently updated datasets.
2. WHEN a user specifies a category filter THEN the DataSF_MCP_Server SHALL return only datasets matching that category.
3. WHEN listing datasets THEN the DataSF_MCP_Server SHALL include the category/domain for each dataset to aid discovery.

### Requirement 2: Schema Retrieval

**User Story:** As an LLM user, I want to retrieve the schema of a dataset, so that I can write accurate SoQL queries with correct column names.

#### Acceptance Criteria

1. WHEN a user requests schema for a valid 4x4 dataset ID THEN the DataSF_MCP_Server SHALL return the list of columns with their human-readable names, API field names, and data types.
2. WHEN a user provides an invalid 4x4 ID format THEN the DataSF_MCP_Server SHALL reject the request and return a validation error message.
3. WHEN a user provides a valid format but non-existent dataset ID THEN the DataSF_MCP_Server SHALL return a clear error indicating the dataset was not found.
4. WHEN schema is retrieved THEN the DataSF_MCP_Server SHALL cache the result in memory for subsequent requests to the same dataset.

### Requirement 3: Data Querying

**User Story:** As an LLM user, I want to execute SoQL queries against datasets, so that I can retrieve and analyze San Francisco public data.

#### Acceptance Criteria

1. WHEN a user submits a valid SoQL query with a valid dataset ID THEN the DataSF_MCP_Server SHALL execute the query and return the results as JSON.
2. WHEN a user submits a SoQL query with syntax errors THEN the DataSF_MCP_Server SHALL return the Socrata error message to enable LLM self-correction.
3. WHEN query results exceed a reasonable size THEN the DataSF_MCP_Server SHALL truncate results and indicate truncation occurred.
4. WHEN the Socrata API is rate-limited THEN the DataSF_MCP_Server SHALL return a specific error message indicating rate limiting.
5. WHEN a query times out THEN the DataSF_MCP_Server SHALL return a timeout error after a configurable duration (default 30 seconds).

### Requirement 4: Column Name Auto-Correction

**User Story:** As an LLM user, I want the server to auto-correct minor typos in column names, so that queries succeed even with small mistakes.

#### Acceptance Criteria

1. WHEN a SoQL query contains a column name that closely matches a valid field name THEN the DataSF_MCP_Server SHALL substitute the correct field name using fuzzy matching.
2. WHEN auto-correction occurs THEN the DataSF_MCP_Server SHALL include the corrections made in the response metadata.
3. WHEN a column name has no close match (similarity below threshold) THEN the DataSF_MCP_Server SHALL pass the original name through and let Socrata return the error.
4. WHEN multiple columns need correction THEN the DataSF_MCP_Server SHALL correct all of them in a single pass.

### Requirement 5: Authentication and Rate Limiting

**User Story:** As a server operator, I want to optionally configure an App Token, so that API requests have higher rate limits when needed.

#### Acceptance Criteria

1. WHEN the SOCRATA_APP_TOKEN environment variable is set THEN the DataSF_MCP_Server SHALL include the token in all Socrata API request headers.
2. WHEN the SOCRATA_APP_TOKEN environment variable is not set THEN the DataSF_MCP_Server SHALL operate without authentication since DataSF public data does not require a token for access.
3. WHEN operating without an App Token THEN the DataSF_MCP_Server SHALL function normally but may experience lower rate limits imposed by Socrata.
4. WHEN making API requests THEN the DataSF_MCP_Server SHALL never expose the App Token in responses or logs visible to the LLM.

### Requirement 6: MCP Protocol Compliance

**User Story:** As an MCP client, I want the server to comply with the MCP protocol, so that it integrates seamlessly with MCP-compatible applications.

#### Acceptance Criteria

1. WHEN the server starts THEN the DataSF_MCP_Server SHALL register all available tools with proper JSON schemas using the MCP SDK.
2. WHEN a tool is called THEN the DataSF_MCP_Server SHALL validate input arguments against the defined Zod schemas before processing.
3. WHEN returning results THEN the DataSF_MCP_Server SHALL format responses according to MCP content type specifications.
4. WHEN an unknown tool is requested THEN the DataSF_MCP_Server SHALL return a standardized error response.

### Requirement 7: Input Validation

**User Story:** As a server operator, I want all inputs validated, so that malformed requests are rejected before reaching external APIs.

#### Acceptance Criteria

1. WHEN a dataset ID is provided THEN the DataSF_MCP_Server SHALL validate it matches the pattern `^[a-z0-9]{4}-[a-z0-9]{4}$`.
2. WHEN a search query is provided THEN the DataSF_MCP_Server SHALL validate it is a non-empty string with a maximum length of 500 characters.
3. WHEN a SoQL query is provided THEN the DataSF_MCP_Server SHALL validate it is a non-empty string with a maximum length of 4000 characters.
4. WHEN validation fails THEN the DataSF_MCP_Server SHALL return a descriptive error message indicating which validation rule was violated.
