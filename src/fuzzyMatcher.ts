/**
 * Fuzzy Matcher
 * Provides column name auto-correction using Fuse.js
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import Fuse from 'fuse.js';

/**
 * Result of a column name correction operation
 */
export interface CorrectionResult {
  original: string;
  corrected: string;
  wasChanged: boolean;
}

/**
 * Result of correcting a SoQL query
 */
export interface SoqlCorrectionResult {
  correctedQuery: string;
  corrections: CorrectionResult[];
}

/**
 * Fuzzy matcher for auto-correcting column names in SoQL queries
 */
export class FuzzyMatcher {
  private threshold: number;

  /**
   * Create a new FuzzyMatcher
   * @param threshold Fuzzy matching threshold (0-1, lower is more strict). Default: 0.4
   */
  constructor(threshold: number = 0.4) {
    this.threshold = threshold;
  }

  /**
   * Correct a list of user-provided field names against valid field names
   * Requirement 4.1, 4.2, 4.3, 4.4
   * 
   * @param userFields Array of field names to correct
   * @param validFields Array of valid field names from the schema
   * @returns Array of correction results
   */
  correctColumns(userFields: string[], validFields: string[]): CorrectionResult[] {
    const fuse = new Fuse(validFields, {
      threshold: this.threshold,
      includeScore: true,
    });

    return userFields.map(original => {
      const results = fuse.search(original);
      
      // If we have a match within threshold, use it
      if (results.length > 0 && results[0].score !== undefined && results[0].score <= this.threshold) {
        const corrected = results[0].item;
        return {
          original,
          corrected,
          wasChanged: original !== corrected,
        };
      }
      
      // No match found, pass through unchanged (Requirement 4.3)
      return {
        original,
        corrected: original,
        wasChanged: false,
      };
    });
  }

  /**
   * Parse a SoQL query and correct column names
   * Requirement 4.1, 4.2, 4.3, 4.4
   * 
   * This method extracts field names from a SoQL query and corrects them
   * against the valid field names from the dataset schema.
   * 
   * @param soql The SoQL query string
   * @param validFields Array of valid field names from the schema
   * @returns Corrected query and list of corrections made
   */
  correctSoqlQuery(soql: string, validFields: string[]): SoqlCorrectionResult {
    // Extract potential field names from the SoQL query
    // Field names can appear in SELECT, WHERE, ORDER BY, GROUP BY clauses
    // We'll use a regex to find identifiers (alphanumeric + underscore)
    const fieldPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = [...soql.matchAll(fieldPattern)];
    
    // Get unique field names (excluding SQL keywords)
    const sqlKeywords = new Set([
      'select', 'from', 'where', 'order', 'by', 'group', 'limit', 'offset',
      'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null', 'as',
      'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max', 'distinct',
      'having', 'join', 'left', 'right', 'inner', 'outer', 'on', 'case',
      'when', 'then', 'else', 'end', 'true', 'false'
    ]);
    
    const userFields = [...new Set(
      matches
        .map(m => m[1])
        .filter(field => !sqlKeywords.has(field.toLowerCase()))
    )];
    
    // Get corrections for all extracted fields
    const corrections = this.correctColumns(userFields, validFields);
    
    // Build a map of corrections that were actually changed
    const correctionMap = new Map<string, string>();
    corrections
      .filter(c => c.wasChanged)
      .forEach(c => correctionMap.set(c.original, c.corrected));
    
    // Replace field names in the query
    let correctedQuery = soql;
    correctionMap.forEach((corrected, original) => {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      correctedQuery = correctedQuery.replace(regex, corrected);
    });
    
    return {
      correctedQuery,
      corrections: corrections.filter(c => c.wasChanged), // Only return actual corrections (Requirement 4.2)
    };
  }
}
