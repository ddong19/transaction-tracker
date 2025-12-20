// Helper to reset IndexedDB if there are issues
// You can call this from the browser console: window.resetDB()

export async function resetIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spending-tracker-db');

    request.onsuccess = () => {
      console.log('Database reset successfully. Please refresh the page.');
      resolve(true);
    };

    request.onerror = () => {
      console.error('Error resetting database:', request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('Database reset blocked. Please close all tabs using this app and try again.');
    };
  });
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).resetDB = resetIndexedDB;
}
