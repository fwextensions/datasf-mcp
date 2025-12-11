#!/usr/bin/env node
/**
 * DataSF MCP Server
 * Main entry point that wires all components together
 * Requirements: 6.1, 6.2
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SocrataClient } from './socrataClient.js';
import { SchemaCache } from './cache.js';
import { FuzzyMatcher } from './fuzzyMatcher.js';
import {
  DatasetIdSchema,
  SearchQuerySchema,
  SoqlQuerySchema,
  validateDatasetId,
  validateSearchQuery,
  validateSoqlQuery,
} from './validator.js';
import { handleApiCall, isErrorResponse } from './errorHandler.js';

// Initialize components
const schemaCache = new SchemaCache();
const socrataClient = new SocrataClient(schemaCache);
const fuzzyMatcher = new FuzzyMatcher();

// Define input schemas for tools
const SearchInputSchema = z.object({
  query: SearchQuerySchema,
  limit: z.number().min(1).max(20).optional().default(5),
});

const ListInputSchema = z.object({
  category: z.string().optional(),
  limit: z.number().min(1).max(20).optional().default(5),
});

const GetSchemaInputSchema = z.object({
  dataset_id: DatasetIdSchema,
});

const QueryInputSchema = z.object({
  dataset_id: DatasetIdSchema,
  soql: SoqlQuerySchema,
  auto_correct: z.boolean().optional().default(true),
});

// Initialize MCP Server (Requirement 6.1)
const server = new Server(
  {
    name: 'datasf-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register ListToolsRequestSchema handler with all 4 tools (Requirement 6.1)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_datasf',
        description:
          'Search for public datasets in San Francisco\'s open data portal by keywords. Returns dataset IDs, names, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (1-500 characters)',
              minLength: 1,
              maxLength: 500,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5, max: 20)',
              minimum: 1,
              maximum: 20,
              default: 5,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_datasf',
        description:
          'Browse available datasets from San Francisco\'s open data portal. Optionally filter by category. Returns recently updated or popular datasets.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional category filter',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5, max: 20)',
              minimum: 1,
              maximum: 20,
              default: 5,
            },
          },
        },
      },
      {
        name: 'get_schema',
        description:
          'Get the schema (columns and data types) for a specific dataset. Call this before writing queries to learn the correct field names.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset 4x4 ID (format: xxxx-xxxx)',
              pattern: '^[a-z0-9]{4}-[a-z0-9]{4}$',
            },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'query_datasf',
        description:
          'Execute a SoQL (Socrata Query Language) query against a dataset. Supports auto-correction of column names. Returns query results as JSON.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset 4x4 ID (format: xxxx-xxxx)',
              pattern: '^[a-z0-9]{4}-[a-z0-9]{4}$',
            },
            soql: {
              type: 'string',
              description: 'SoQL query string (1-4000 characters)',
              minLength: 1,
              maxLength: 4000,
            },
            auto_correct: {
              type: 'boolean',
              description: 'Enable automatic column name correction (default: true)',
              default: true,
            },
          },
          required: ['dataset_id', 'soql'],
        },
      },
    ],
  };
});

// Register CallToolRequestSchema handler (Requirement 6.2)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Handle search_datasf tool (Requirements: 1.1, 1.2, 1.3, 1.4)
    if (name === 'search_datasf') {
      // Validate input with SearchQuerySchema (Requirement 6.2)
      const parseResult = SearchInputSchema.safeParse(args);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Invalid input: ${parseResult.error.issues[0].message}`,
                error_type: 'validation',
              }, null, 2),
            },
          ],
        };
      }

      const { query, limit } = parseResult.data;

      // Call socrataClient.searchDatasets
      const result = await handleApiCall(async () => {
        return await socrataClient.searchDatasets(query, limit);
      });

      // Check if error occurred
      if (isErrorResponse(result)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Format response as MCP content (Requirement 1.3)
      const response = {
        results: result,
        count: result.length,
        message: result.length === 0 ? 'No results found' : undefined,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Handle list_datasf tool (Requirements: 1B.1, 1B.2, 1B.3)
    if (name === 'list_datasf') {
      // Validate optional category input (Requirement 6.2)
      const parseResult = ListInputSchema.safeParse(args);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Invalid input: ${parseResult.error.issues[0].message}`,
                error_type: 'validation',
              }, null, 2),
            },
          ],
        };
      }

      const { category, limit } = parseResult.data;

      // Call socrataClient.listDatasets
      const result = await handleApiCall(async () => {
        return await socrataClient.listDatasets(category, limit);
      });

      // Check if error occurred
      if (isErrorResponse(result)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Format response as MCP content
      const response = {
        results: result,
        count: result.length,
        category: category || 'all',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Handle get_schema tool (Requirements: 2.1, 2.2, 2.3, 2.4)
    if (name === 'get_schema') {
      // Validate dataset_id with DatasetIdSchema (Requirement 6.2)
      const parseResult = GetSchemaInputSchema.safeParse(args);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Invalid input: ${parseResult.error.issues[0].message}`,
                error_type: 'validation',
              }, null, 2),
            },
          ],
        };
      }

      const { dataset_id } = parseResult.data;

      // Check if schema is cached
      const wasCached = schemaCache.has(dataset_id);

      // Call socrataClient.getSchema (uses cache)
      const result = await handleApiCall(async () => {
        return await socrataClient.getSchema(dataset_id);
      });

      // Check if error occurred
      if (isErrorResponse(result)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Format response with columns and cached indicator
      const response = {
        dataset_id,
        dataset_name: result.datasetName,
        columns: result.columns,
        row_count: result.rowCount,
        cached: wasCached,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Handle query_datasf tool (Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4)
    if (name === 'query_datasf') {
      // Validate dataset_id and soql inputs (Requirement 6.2)
      const parseResult = QueryInputSchema.safeParse(args);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Invalid input: ${parseResult.error.issues[0].message}`,
                error_type: 'validation',
              }, null, 2),
            },
          ],
        };
      }

      const { dataset_id, soql, auto_correct } = parseResult.data;

      let finalSoql = soql;
      let corrections: any[] | undefined;

      // Optionally apply fuzzy correction to SoQL (Requirements: 4.1, 4.2, 4.3, 4.4)
      if (auto_correct) {
        // Get schema to get valid field names
        const schemaResult = await handleApiCall(async () => {
          return await socrataClient.getSchema(dataset_id);
        });

        if (!isErrorResponse(schemaResult)) {
          const validFields = schemaResult.columns.map(col => col.fieldName);
          const correctionResult = fuzzyMatcher.correctSoqlQuery(soql, validFields);
          finalSoql = correctionResult.correctedQuery;
          
          // Include corrections in response metadata if any were made
          if (correctionResult.corrections.length > 0) {
            corrections = correctionResult.corrections;
          }
        }
      }

      // Call socrataClient.queryResource
      const result = await handleApiCall(async () => {
        return await socrataClient.queryResource(dataset_id, finalSoql);
      });

      // Check if error occurred
      if (isErrorResponse(result)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Format response with data and corrections
      const MAX_RESULTS = 1000;
      const response: any = {
        data: result,
        count: result.length,
        truncated: result.length >= MAX_RESULTS,
      };

      // Include corrections in response metadata
      if (corrections && corrections.length > 0) {
        response.corrections = corrections;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Unknown tool error handling (Requirement 6.4)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Unknown tool: ${name}`,
            error_type: 'validation',
          }, null, 2),
        },
      ],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            error_type: 'api_error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Main function to start the server
async function main() {
  // Log startup information
  console.error('=================================');
  console.error('DataSF MCP Server v1.0.0');
  console.error('=================================');
  console.error('Initializing components...');
  console.error('- Schema Cache: Ready');
  console.error('- Socrata Client: Ready');
  console.error('- Fuzzy Matcher: Ready');
  console.error('- App Token:', process.env.SOCRATA_APP_TOKEN ? 'Configured' : 'Not configured (using public access)');
  console.error('');
  console.error('Registered tools:');
  console.error('  1. search_datasf - Search for datasets by keywords');
  console.error('  2. list_datasf - Browse available datasets');
  console.error('  3. get_schema - Get dataset schema information');
  console.error('  4. query_datasf - Execute SoQL queries');
  console.error('');
  
  // Connect server to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Server running on stdio transport');
  console.error('Ready to accept requests');
  console.error('=================================');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
