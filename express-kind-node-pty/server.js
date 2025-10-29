const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const pty = require("node-pty");
const {
  isCorrect,
  getCurrentQuestion,
  resetQuestions,
} = require("./is-correct");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active PTY sessions
const sessions = new Map();

// HTTP Endpoints

/**
 * GET /question
 * Returns the current question and solution
 */
app.get("/question", (req, res) => {
  try {
    const question = getCurrentQuestion();
    res.json({
      id: question.id,
      question: question.question,
      solution: question.solution,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve question" });
  }
});

/**
 * POST /is-correct
 * Checks if the submitted answer is correct
 * Body: { answer: "user's answer string" }
 */
app.post("/is-correct", (req, res) => {
  try {
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        error: "Answer is required",
        correct: false,
      });
    }

    const correct = isCorrect(answer);

    res.json({
      correct,
      message: correct
        ? "Correct! Moving to next question."
        : "Incorrect. Try again.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to check answer",
      correct: false,
    });
  }
});

/**
 * POST /reset
 * Reset questions to the beginning
 */
app.post("/reset", (req, res) => {
  try {
    resetQuestions();
    res.json({ message: "Questions reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset questions" });
  }
});

/**
 * GET /
 * Health check and API information
 */
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Kind Web Terminal Server - WebSocket API",
    endpoints: {
      websocket: "ws://localhost:3000",
      question: "GET /question",
      isCorrect: "POST /is-correct",
      reset: "POST /reset",
    },
  });
});

// WebSocket connection for terminal
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  // Create a new PTY session
  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || "/root",
    env: process.env,
  });

  const sessionId = Date.now().toString();
  sessions.set(sessionId, ptyProcess);

  console.log(`PTY session created: ${sessionId}`);

  // Send data from PTY to WebSocket client
  ptyProcess.onData((data) => {
    try {
      ws.send(JSON.stringify({ type: "output", data }));
    } catch (error) {
      console.error("Error sending data to client:", error);
    }
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(
      `PTY process exited with code ${exitCode} and signal ${signal}`,
    );
    sessions.delete(sessionId);
    try {
      ws.send(
        JSON.stringify({
          type: "exit",
          exitCode,
          signal,
        }),
      );
      ws.close();
    } catch (error) {
      console.error("Error handling PTY exit:", error);
    }
  });

  // Receive data from WebSocket client and write to PTY
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "input") {
        ptyProcess.write(data.data);
      } else if (data.type === "resize") {
        ptyProcess.resize(data.cols || 80, data.rows || 30);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  // Handle WebSocket close
  ws.on("close", () => {
    console.log(`WebSocket connection closed for session ${sessionId}`);
    if (sessions.has(sessionId)) {
      ptyProcess.kill();
      sessions.delete(sessionId);
    }
  });

  // Handle WebSocket errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Connected to terminal",
      sessionId,
    }),
  );
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`HTTP endpoints:`);
  console.log(`  - GET  / (health check)`);
  console.log(`  - GET  /question`);
  console.log(`  - POST /is-correct`);
  console.log(`  - POST /reset`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  sessions.forEach((ptyProcess) => {
    ptyProcess.kill();
  });
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
