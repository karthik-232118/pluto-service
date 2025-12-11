const createSyncManager = require("./index"); // Adjust the path if needed
const path = require("path");

let syncManagerInstance;

/**
 * Initializes and runs the Sync Manager.
 */
async function runSyncManager() {
  if (syncManagerInstance) {
    console.log("Sync Manager is already running.");
    return syncManagerInstance;
  }

  const documentPath = path.posix.join("src/infrastructure/media/Document");
  // Initialize the Sync Manager
  syncManagerInstance = createSyncManager(documentPath, {
    syncInterval: 3000, // Sync every 3 seconds
    networkCheckInterval: 3000, // Sync every 3 seconds
    maxRetries: 5, // Retry failed syncs up to 5 times
  });

  // Add Event Listeners
  syncManagerInstance.on("fileChange", ({ event, path }) => {
    console.log(`[SyncManager] File ${event}: ${path}`);
  });

  syncManagerInstance.on("syncComplete", ({ path }) => {
    console.log(`[SyncManager] Sync completed for: ${path}`);
  });

  syncManagerInstance.on("syncError", ({ path, error }) => {
    console.error(`[SyncManager] Sync error for ${path}:`, error);
  });

  syncManagerInstance.on("connectionChange", ({ isOnline }) => {
    console.log(
      `[SyncManager] Connection status: ${isOnline ? "online" : "offline"}`
    );
  });

  try {
    await syncManagerInstance.initialize();
    console.log("[SyncManager] Initialized and running.");
  } catch (error) {
    console.error("[SyncManager] Initialization failed:", error);
  }

  return syncManagerInstance;
}

module.exports = runSyncManager;
