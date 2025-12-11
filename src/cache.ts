/**
 * Schema Cache
 * In-memory cache for dataset schemas to reduce API calls
 * Requirements: 2.4
 */

/**
 * Column information from a dataset schema
 */
export interface ColumnInfo {
  name: string;      // Human-readable name
  fieldName: string; // API field name for SoQL
  dataType: string;  // Data type (text, number, calendar_date, etc.)
}

/**
 * Schema result containing dataset metadata and columns
 */
export interface SchemaResult {
  columns: ColumnInfo[];
  datasetName: string;
  rowCount: number;
}

/**
 * Internal cache entry with timestamp for TTL expiration
 */
interface CacheEntry {
  schema: SchemaResult;
  timestamp: number;
}

/**
 * In-memory cache for dataset schemas with TTL support
 */
export class SchemaCache {
  private cache: Map<string, CacheEntry>;
  private ttlMs: number;

  /**
   * Create a new SchemaCache
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Get a schema from the cache if it exists and hasn't expired
   * @param datasetId The 4x4 dataset ID
   * @returns The cached schema or null if not found/expired
   */
  get(datasetId: string): SchemaResult | null {
    const entry = this.cache.get(datasetId);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(datasetId);
      return null;
    }

    return entry.schema;
  }

  /**
   * Store a schema in the cache
   * @param datasetId The 4x4 dataset ID
   * @param schema The schema to cache
   */
  set(datasetId: string, schema: SchemaResult): void {
    this.cache.set(datasetId, {
      schema,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a non-expired schema exists in the cache
   * @param datasetId The 4x4 dataset ID
   * @returns true if a valid cached entry exists
   */
  has(datasetId: string): boolean {
    return this.get(datasetId) !== null;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }
}
