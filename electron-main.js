const { app, BrowserWindow } = require("electron");
const path = require("path");
const net = require("net");

// Load .env manually so the Express app can read it
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Import your Express app (it will use the env vars we just loaded)
const serverApp = require("./server");

let mainWindow;
let server;

// Find a random free port
function findFreePort() {
  return new Promise((resolve, reject) => {
    const tempServer = net.createServer();
    tempServer.listen(0, () => {
      const port = tempServer.address().port;
      tempServer.close(() => resolve(port));
    });
    tempServer.on("error", reject);
  });
}

// Start the Express server on the given port
function startServer(port) {
  return new Promise((resolve, reject) => {
    server = serverApp.listen(port, () => {
      console.log(`Server running on port ${port}`);
      resolve();
    });
    server.on("error", reject);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${server.address().port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await findFreePort();
    await startServer(port);
    createWindow();
  } catch (err) {
    console.error("Failed to start:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (server) server.close();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
