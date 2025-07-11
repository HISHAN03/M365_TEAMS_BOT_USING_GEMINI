const uuidv4 = require('uuid').v4;
async function getJokeFromMCP(tool, method, uri, args = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: uuidv4(),
    method: method,
    params: {
      name: tool || null,
      uri: uri || null,
      arguments: args,
      _meta: {
        progressToken: uuidv4(),
      },
    },
  };

  try {
    const response = await fetch("https://5288sx33-3000.inc1.devtunnels.ms/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const dataLine = responseText.split('\n').find(line => line.startsWith('data:'));
    if (!dataLine) return "❌ No JSON payload found in event stream.";
    return JSON.parse(dataLine.substring(5).trim());
  } catch (err) {
    console.error("❌ MCP call failed:", err.message);
    return "❌ Failed to get joke.";
  }
}



module.exports = { getJokeFromMCP };
