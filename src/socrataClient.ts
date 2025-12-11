/**
 * Socrata Client
 * Handles all HTTP communication with Socrata APIs
 */

import axios, { AxiosInstance } from 'axios';
import { SchemaCache, SchemaResult, ColumnInfo } from './cache.js';

/**
 * Dataset search result from Discovery API
 */
export interface DatasetSearchResult {
  id: string;        // 4x4 ID
  name: string;      // Dataset name
  description: string;
  category?: string; // Optional category/domain
}

/**
 * SocrataClient handles all HTTP communication with Socrata APIs
 * Requirements: 5.1, 5.2, 3.5
 */
export class SocrataClient {
  private axiosInstance: AxiosInstance;
  private schemaCache: SchemaCache;
  private appToken?: string;

  constructor(schemaCache?: SchemaCache) {
    // Read app token from environment (Requirement 5.1)
    this.appToken = process.env.SOCRATA_APP_TOKEN;
    
    // Initialize schema cache
    this.schemaCache = schemaCache || new SchemaCache();

    // Configure axios with 30 second timeout (Requirement 3.5)
    this.axiosInstance = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Get headers for Socrata API requests
   * Injects X-App-Token when available (Requirement 5.1)
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.appToken) {
      headers['X-App-Token'] = this.appToken;
    }

    return headers;
  }

  /**
   * Search for datasets by keywords
   * Requirements: 1.1, 1.2
   * 
   * @param query Search keywords
   * @param limit Maximum number of results (default: 5)
   * @returns Array of matching datasets
   */
  async searchDatasets(query: string, limit: number = 5): Promise<DatasetSearchResult[]> {
    const response = await this.axiosInstance.get(
      'https://api.us.socrata.com/api/catalog/v1',
      {
        params: {
          q: query,
          domains: 'data.sfgov.org',
          search_context: 'data.sfgov.org',
          limit: limit,
          offset: 0,
          order: 'relevance',
          published: true,
          approval_status: 'approved',
          explicitly_hidden: false,
        },
        headers: this.getHeaders(),
      }
    );

    // Map response to DatasetSearchResult array
    const results = response.data.results || [];
    return results.map((item: any) => ({
      id: item.resource.id,
      name: item.resource.name,
      description: item.resource.description || '',
      category: item.classification?.domain_category,
    }));
  }

  /**
   * List datasets, optionally filtered by category
   * Requirements: 1B.1, 1B.2, 1B.3
   * 
   * @param category Optional category filter
   * @param limit Maximum number of results (default: 5)
   * @returns Array of datasets
   */
  async listDatasets(category?: string, limit: number = 5): Promise<DatasetSearchResult[]> {
    const params: any = {
      domains: 'data.sfgov.org',
      limit: limit,
      order: 'updatedAt', // Sort by recently updated
    };

    if (category) {
      params.categories = category;
    }

    const response = await this.axiosInstance.get(
      'https://api.us.socrata.com/api/catalog/v1',
      {
        params,
        headers: this.getHeaders(),
      }
    );

    // Map response to DatasetSearchResult array with category
    const results = response.data.results || [];
    return results.map((item: any) => ({
      id: item.resource.id,
      name: item.resource.name,
      description: item.resource.description || '',
      category: item.classification?.domain_category,
    }));
  }

  /**
   * Get schema for a dataset
   * Requirements: 2.1, 2.4
   * 
   * @param datasetId The 4x4 dataset ID
   * @returns Schema information including columns
   */
  async getSchema(datasetId: string): Promise<SchemaResult> {
    // Check cache first (Requirement 2.4)
    const cached = this.schemaCache.get(datasetId);
    if (cached) {
      return cached;
    }

    // Call Views API
    const response = await this.axiosInstance.get(
      `https://data.sfgov.org/api/views/${datasetId}.json`,
      {
        headers: this.getHeaders(),
      }
    );

    // Extract columns with name, fieldName, dataType
    const columns: ColumnInfo[] = (response.data.columns || []).map((col: any) => ({
      name: col.name,
      fieldName: col.fieldName,
      dataType: col.dataTypeName || 'text',
    }));

    const schema: SchemaResult = {
      columns,
      datasetName: response.data.name,
      rowCount: response.data.rowsUpdatedAt ? parseInt(response.data.rowsUpdatedAt) : 0,
    };

    // Cache the result
    this.schemaCache.set(datasetId, schema);

    return schema;
  }

  /**
   * Execute a SoQL query against a dataset
   * Requirements: 3.1, 3.3
   * 
   * @param datasetId The 4x4 dataset ID
   * @param soql The SoQL query string
   * @returns Query results as JSON array
   */
  async queryResource(datasetId: string, soql: string): Promise<unknown[]> {
    const response = await this.axiosInstance.get(
      `https://data.sfgov.org/resource/${datasetId}.json`,
      {
        params: {
          $query: soql,
        },
        headers: this.getHeaders(),
      }
    );

    const results = response.data || [];

    // Handle result truncation for large responses (Requirement 3.3)
    const MAX_RESULTS = 1000;
    if (results.length > MAX_RESULTS) {
      return results.slice(0, MAX_RESULTS);
    }

    return results;
  }
}
