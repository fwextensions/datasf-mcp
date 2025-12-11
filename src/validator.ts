/**
 * Input Validator
 * Validates all inputs using Zod schemas
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { z } from 'zod';

/**
 * Schema for validating Socrata 4x4 dataset IDs
 * Format: xxxx-xxxx where x is lowercase alphanumeric
 * Requirement 7.1
 */
export const DatasetIdSchema = z
  .string()
  .regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/, {
    message: 'dataset_id must match pattern xxxx-xxxx (lowercase alphanumeric)',
  });

/**
 * Schema for validating search queries
 * Non-empty string with max 500 characters
 * Requirement 7.2
 */
export const SearchQuerySchema = z
  .string()
  .min(1, { message: 'query must not be empty' })
  .max(500, { message: 'query must not exceed 500 characters' });

/**
 * Schema for validating SoQL queries
 * Non-empty string with max 4000 characters
 * Requirement 7.3
 */
export const SoqlQuerySchema = z
  .string()
  .min(1, { message: 'soql must not be empty' })
  .max(4000, { message: 'soql must not exceed 4000 characters' });

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a dataset ID against the 4x4 pattern
 * Requirement 7.1, 7.4
 */
export function validateDatasetId(id: string): ValidationResult {
  const result = DatasetIdSchema.safeParse(id);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Invalid dataset_id: ${result.error.issues[0].message}`,
  };
}

/**
 * Validates a search query string
 * Requirement 7.2, 7.4
 */
export function validateSearchQuery(query: string): ValidationResult {
  const result = SearchQuerySchema.safeParse(query);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Invalid query: ${result.error.issues[0].message}`,
  };
}

/**
 * Validates a SoQL query string
 * Requirement 7.3, 7.4
 */
export function validateSoqlQuery(soql: string): ValidationResult {
  const result = SoqlQuerySchema.safeParse(soql);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Invalid soql: ${result.error.issues[0].message}`,
  };
}
