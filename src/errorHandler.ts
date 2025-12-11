/**
 * Error Handler Utility
 * Provides error classification and handling for API calls
 * Requirements: 1.4, 2.3, 3.2, 3.4, 3.5
 */

import axios from 'axios';

/**
 * Error types for classification
 */
export type ErrorType = 
  | 'validation'
  | 'not_found'
  | 'rate_limit'
  | 'timeout'
  | 'api_error';

/**
 * Standardized error response
 */
export interface ErrorResponse {
  error: string;
  error_type: ErrorType;
  details?: string;
}

/**
 * Wraps an API call with error handling and classification
 * 
 * @param fn The async function to execute
 * @returns The result of the function or an ErrorResponse
 */
export async function handleApiCall<T>(
  fn: () => Promise<T>
): Promise<T | ErrorResponse> {
  try {
    return await fn();
  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      // Timeout error (Requirement 3.5)
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          error: 'Request timed out after 30 seconds',
          error_type: 'timeout',
        };
      }

      // HTTP status-based classification
      if (error.response) {
        const status = error.response.status;
        
        // Not found error (Requirement 2.3)
        if (status === 404) {
          return {
            error: 'Dataset not found',
            error_type: 'not_found',
            details: error.response.data?.message,
          };
        }

        // Rate limit error (Requirement 3.4)
        if (status === 429) {
          return {
            error: 'Rate limited. Try again later.',
            error_type: 'rate_limit',
            details: error.response.data?.message,
          };
        }

        // Other API errors (Requirements 1.4, 3.2)
        // Extract Socrata error message for LLM self-correction
        const socrataMessage = 
          error.response.data?.message || 
          error.response.data?.error ||
          error.message;

        return {
          error: socrataMessage,
          error_type: 'api_error',
          details: error.response.data?.errorCode,
        };
      }

      // Network error without response
      return {
        error: error.message || 'Network error occurred',
        error_type: 'api_error',
      };
    }

    // Non-axios errors - rethrow
    throw error;
  }
}

/**
 * Check if a result is an error response
 * 
 * @param result The result to check
 * @returns True if the result is an ErrorResponse
 */
export function isErrorResponse(result: unknown): result is ErrorResponse {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    'error_type' in result
  );
}
