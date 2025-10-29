#!/usr/bin/env node

const WebSocket = require("ws");
const readline = require("readline");

// Configuration
const WS_URL = process.env.WS_URL || "ws://localhost:3000";

// Connect to WebSocket server
console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

// Set up readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

ws.on("open", () => {
  console.log("Connected to terminal server!\n");

  // Enable raw mode for stdin to capture every keystroke
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on("data", (key) => {
    // Send input to the server
    ws.send(
      JSON.stringify({
        type: "input",
        data: key.toString(),
      }),
    );

    // Handle Ctrl+C
    if (key.toString() === "\u0003") {
      console.log("\n\nDisconnecting...");
      ws.close();
      process.exit(0);
    }
  });
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      case "connected":
        console.log(`Session ID: ${message.sessionId}`);
        console.log("Type commands below (Ctrl+C to exit)\n");
        break;

      case "output":
        // Write terminal output directly to stdout
        process.stdout.write(message.data);
        break;

      case "exit":
        console.log(
          `\n\nTerminal process exited with code ${message.exitCode}`,
        );
        ws.close();
        process.exit(message.exitCode);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  } catch (error) {
    console.error("Error parsing message:", error);
  }
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error.message);
  process.exit(1);
});

ws.on("close", () => {
  console.log("\nConnection closed");

  // Restore terminal settings
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  process.exit(0);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n\nReceived SIGINT, closing connection...");
  ws.close();
  process.exit(0);
});
