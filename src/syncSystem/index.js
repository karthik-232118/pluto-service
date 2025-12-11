const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const EventEmitter = require("events");
const chokidar = require("chokidar");
const helper = require("../utils/helper");

function createSyncManager(localDir, options = {}) {
  const emitter = new EventEmitter();
  const syncDb = new Map(); // Stores file metadata
  const syncQueue = new Map(); // Stores pending sync operations
  let isOnline = true;
  let watcher = null;
  let networkCheckInterval = null;

  const defaultOptions = {
    ignorePatterns: [".DS_Store", "Thumbs.db", "*.tmp"],
    syncInterval: 5000, // 5 seconds
    maxRetries: 3,
  };
  const config = { ...defaultOptions, ...options };

  async function initialize() {
    // Create local directory if it doesn't exist
    await fs.mkdir(localDir, { recursive: true });

    // Initialize file watcher
    watcher = chokidar.watch(localDir, {
      ignored: config.ignorePatterns,
      persistent: true,
      ignoreInitial: false,
    });

    // Setup watchers
    watcher
      .on("add", (filePath) => handleFileChange("add", filePath))
      .on("change", (filePath) => handleFileChange("change", filePath))
      .on("unlink", (filePath) => handleFileChange("delete", filePath));

    // Start sync loop
    startSyncLoop();

    // Start network status monitoring
    startNetworkMonitoring();

    // Load existing files metadata
    await loadLocalFiles();
  }

  async function loadLocalFiles() {
    const files = await scanDirectory(localDir);
    for (const file of files) {
      const metadata = await getFileMetadata(file);
      syncDb.set(file, metadata);
    }
  }

  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await scanDirectory(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  async function getFileMetadata(filePath) {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash("md5").update(content).digest("hex");

    return {
      path: filePath,
      size: stats.size,
      modifiedTime: stats.mtime,
      hash,
      lastSync: null,
      status: "local", // local, synced, conflict
    };
  }

  async function handleFileChange(event, filePath) {
    try {
      const relativePath = path.relative(localDir, filePath);

      switch (event) {
        case "add":
        case "change": {
          // Check for file content differences
          const oldFilePath = path.posix.join(
            "src/infrastructure/media/Document",
            "Testing file changes.txt"
          );
          const modifiedFilePath = path.posix.join(
            "src/infrastructure/media/Document",
            "Testing file changes_modified.txt"
          );
          const isUpdated = await helper.updateFileContent(
            oldFilePath,
            modifiedFilePath
          );
          if (isUpdated) {
            console.log(`File content updated for: ${filePath}`);
          }

          const metadata = await getFileMetadata(filePath);
          syncDb.set(relativePath, metadata);
          syncQueue.set(relativePath, { event, metadata, retries: 0 });
          break;
        }
        case "delete":
          syncDb.delete(relativePath);
          syncQueue.set(relativePath, { event, retries: 0 });
          break;
      }

      emitter.emit("fileChange", { event, path: relativePath });
    } catch (error) {
      emitter.emit("error", error);
    }
  }

  function startSyncLoop() {
    setInterval(() => {
      if (isOnline) {
        processSyncQueue();
      }
    }, config.syncInterval);
  }

  async function processSyncQueue() {
    for (const [filePath, operation] of syncQueue.entries()) {
      try {
        if (operation.retries >= config.maxRetries) {
          emitter.emit("syncFailed", {
            path: filePath,
            error: "Max retries exceeded",
          });
          syncQueue.delete(filePath);
          continue;
        }

        await syncFile(filePath, operation);
        syncQueue.delete(filePath);
        emitter.emit("syncComplete", { path: filePath });
      } catch (error) {
        operation.retries++;
        emitter.emit("syncError", { path: filePath, error });
      }
    }
  }

  async function syncFile(filePath, operation) {
    // Simulate the sync logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (operation.event !== "delete") {
      const metadata = syncDb.get(filePath);
      metadata.lastSync = new Date();
      metadata.status = "synced";
      syncDb.set(filePath, metadata);
    }
  }

  async function startNetworkMonitoring() {
    const isOnlineLib = (await import("is-online")).default;

    // Check the network status at regular intervals
    networkCheckInterval = setInterval(async () => {
      const status = await isOnlineLib();
      if (status !== isOnline) {
        setOnlineStatus(status);
      }
    }, config.networkCheckInterval);
  }

  function stopNetworkMonitoring() {
    if (networkCheckInterval) {
      clearInterval(networkCheckInterval);
    }
  }

  function setOnlineStatus(status) {
    isOnline = status;
    emitter.emit("connectionChange", { isOnline });

    if (isOnline) {
      emitter.emit("online");
      processSyncQueue(); // Process any pending changes
    } else {
      emitter.emit("offline");
    }
  }

  async function getLocalChanges() {
    const changes = [];
    for (const [filePath, metadata] of syncDb.entries()) {
      if (metadata.status !== "synced") {
        changes.push({ path: filePath, ...metadata });
      }
    }
    return changes;
  }

  async function forceSync(filePath) {
    const metadata = await getFileMetadata(filePath);
    syncQueue.set(filePath, { event: "change", metadata, retries: 0 });
    if (isOnline) {
      await processSyncQueue();
    }
  }

  async function close() {
    if (watcher) {
      await watcher.close();
    }
    emitter.removeAllListeners();
  }

  return {
    initialize,
    setOnlineStatus,
    getLocalChanges,
    forceSync,
    close,
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
  };
}

module.exports = createSyncManager;
