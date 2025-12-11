# DataSF MCP Server Setup Guide

## Quick Test with MCP Inspector

To test the server interactively:

```bash
# Make sure the server is built first
npm run build

# Run the inspector
npx -y @modelcontextprotocol/inspector node dist/index.js
```

The inspector will open in your browser and let you test all four tools:
- `search_datasf` - Search for datasets
- `list_datasf` - Browse datasets
- `get_schema` - Get dataset schema
- `query_datasf` - Execute SoQL queries

## Configuration for Claude Desktop

### Windows
Edit: `%APPDATA%\Claude\claude_desktop_config.json`

### macOS
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Linux
Edit: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "datasf": {
      "command": "node",
      "args": ["/absolute/path/to/datasf-mcp/dist/index.js"],
      "env": {
        "SOCRATA_APP_TOKEN": "your-optional-token"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/datasf-mcp` with the actual full path to this project.

## Configuration for Kiro IDE

Create or edit `.kiro/settings/mcp.json`:

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

## Getting a Socrata App Token (Optional)

The server works without a token for public data, but a token increases rate limits:

1. Go to https://data.sfgov.org/
2. Sign up for a free account
3. Go to Developer Settings
4. Create a new App Token
5. Add it to the `SOCRATA_APP_TOKEN` environment variable in your config

## Testing the Server

### Example queries to try:

1. **Search for datasets**:
   ```
   Search for crime datasets in San Francisco
   ```

2. **Get schema**:
   ```
   Get the schema for dataset wg3w-h783
   ```

3. **Query data**:
   ```
   Query dataset wg3w-h783 with: SELECT * LIMIT 5
   ```

## Troubleshooting

- **Server not starting**: Make sure you ran `npm run build` first
- **Tools not showing up**: Restart your LLM application after adding the config
- **Rate limiting**: Add a Socrata App Token to increase limits
- **Path issues**: Use absolute paths in the configuration
