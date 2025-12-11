# DataSF MCP Server

A Model Context Protocol (MCP) server that provides LLMs with seamless access to San Francisco's open data portal (DataSF), powered by the Socrata platform.

## Overview

This MCP server enables AI assistants like Claude to search, explore, and query San Francisco's public datasets through a simple, standardized interface. It handles the complexity of the Socrata API, provides intelligent column name correction, and includes schema caching for optimal performance.

### Key Features

- 🔍 **Dataset Search & Discovery** - Find datasets by keywords or browse by category
- 📊 **Schema Retrieval** - Get column names and data types before querying
- 💬 **SoQL Query Execution** - Run SQL-like queries against any dataset
- 🎯 **Fuzzy Column Matching** - Auto-corrects typos in column names
- ⚡ **Schema Caching** - Reduces API calls with intelligent caching
- 🔐 **Optional Authentication** - Supports Socrata App Tokens for higher rate limits
- ✅ **Property-Based Testing** - Comprehensive correctness guarantees

## Available Tools

### 1. `search_datasf`
Search for datasets by keywords.

**Parameters:**
- `query` (string, required): Search keywords (1-500 characters)
- `limit` (number, optional): Max results (default: 5, max: 20)

**Example:**
```
Search for police incident datasets
```

### 2. `list_datasf`
Browse available datasets, optionally filtered by category.

**Parameters:**
- `category` (string, optional): Filter by category
- `limit` (number, optional): Max results (default: 5, max: 20)

**Example:**
```
List recent public safety datasets
```

### 3. `get_schema`
Get the schema (columns and data types) for a specific dataset.

**Parameters:**
- `dataset_id` (string, required): Dataset 4x4 ID (format: `xxxx-xxxx`)

**Example:**
```
Get the schema for dataset wg3w-h783
```

### 4. `query_datasf`
Execute a SoQL (Socrata Query Language) query against a dataset.

**Parameters:**
- `dataset_id` (string, required): Dataset 4x4 ID
- `soql` (string, required): SoQL query (1-4000 characters)
- `auto_correct` (boolean, optional): Enable column name correction (default: true)

**Example:**
```
Query dataset wg3w-h783: SELECT incident_category, COUNT(*) GROUP BY incident_category LIMIT 10
```

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd datasf-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. (Optional) Set up a Socrata App Token for higher rate limits:
```bash
export SOCRATA_APP_TOKEN=your-token-here
```

## Usage

### Testing with MCP Inspector

Test the server interactively in your browser:

```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

### Quick Start with npx (Recommended)

The easiest way to use the server is directly from GitHub without cloning:

```json
{
  "mcpServers": {
    "datasf": {
      "command": "npx",
      "args": ["-y", "github:fwextensions/datasf-mcp-server"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-optional-token"
      }
    }
  }
}
```

This will automatically download, build, and run the latest version from GitHub.

### Configuration for Claude Desktop

Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "datasf": {
      "command": "node",
      "args": ["/absolute/path/to/datasf-mcp-server/dist/index.js"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-optional-token"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/datasf-mcp-server` with the actual full path to this project.

### Configuration for Kiro IDE

Create or edit `.kiro/settings/mcp.json`:

**Option 1: Using npx (recommended)**
```json
{
  "mcpServers": {
    "datasf": {
      "command": "npx",
      "args": ["-y", "github:fwextensions/datasf-mcp-server"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-optional-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Option 2: Using local installation**
```json
{
  "mcpServers": {
    "datasf": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-optional-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Getting a Socrata App Token

The server works without authentication for public data, but an App Token increases rate limits:

1. Visit https://data.sfgov.org/
2. Sign up for a free account
3. Navigate to Developer Settings
4. Create a new App Token
5. Add it to your MCP configuration

## Development

### Project Structure

```
datasf-mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── socrataClient.ts      # Socrata API client
│   ├── validator.ts          # Input validation with Zod
│   ├── fuzzyMatcher.ts       # Column name auto-correction
│   ├── cache.ts              # Schema caching
│   ├── errorHandler.ts       # Error handling utilities
│   └── __tests__/
│       └── property/         # Property-based tests
├── dist/                     # Compiled JavaScript output
├── package.json
└── tsconfig.json
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled server
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

### Running Tests

```bash
npm test
```

The project uses property-based testing with `fast-check` to ensure correctness across a wide range of inputs.

## Architecture

The server follows a modular architecture:

1. **MCP Server** - Handles protocol communication via stdio
2. **Socrata Client** - Manages HTTP requests to Socrata APIs
3. **Validator** - Validates all inputs using Zod schemas
4. **Fuzzy Matcher** - Corrects column name typos using Fuse.js
5. **Schema Cache** - Caches dataset schemas in memory (5-minute TTL)
6. **Error Handler** - Classifies and formats errors for LLM consumption


## Example Queries

Once configured in your LLM, you can ask questions like:

- "Search for datasets about housing in San Francisco"
- "What's the schema for the police incidents dataset (wg3w-h783)?"
- "Show me the top 10 incident categories from the police incidents dataset"
- "Find all building permits issued in 2024"
- "What datasets are available about transportation?"

## API Endpoints Used

The server interacts with three Socrata APIs:

- **Discovery API**: `https://api.us.socrata.com/api/catalog/v1` - Dataset search and browsing
- **Views API**: `https://data.sfgov.org/api/views/{id}.json` - Schema retrieval
- **Resource API**: `https://data.sfgov.org/resource/{id}.json` - Data querying

## Error Handling

The server provides descriptive error messages for:

- **Validation errors** - Invalid input format or length
- **Not found** - Dataset doesn't exist
- **Rate limiting** - Too many requests (add App Token to resolve)
- **Timeouts** - Request exceeded 30 seconds
- **API errors** - Socrata-specific errors (e.g., SoQL syntax errors)

## Contributing

Contributions are welcome! The project uses:

- TypeScript for type safety
- Zod for runtime validation
- fast-check for property-based testing
- Vitest as the test runner

## License

MIT

## Resources

- [DataSF Portal](https://data.sfgov.org/)
- [Socrata API Documentation](https://dev.socrata.com/)
- [SoQL Query Language](https://dev.socrata.com/docs/queries/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Troubleshooting

**Server not starting**
- Ensure you ran `npm run build` first
- Check that Node.js 18+ is installed

**Tools not showing up in LLM**
- Verify the path in your config is absolute
- Restart your LLM application after adding the config
- Check the LLM's logs for connection errors

**Rate limiting errors**
- Add a Socrata App Token to your configuration
- Reduce the frequency of requests

**Column name errors in queries**
- Use `get_schema` first to see valid column names
- Enable `auto_correct: true` (default) for automatic typo correction
