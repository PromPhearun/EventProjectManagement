export interface ClickUpUpdate {
  id: string;
  taskId: string;
  taskName: string;
  taskUrl?: string;
  event: string;
  assignees?: string;
  creator?: string;
  history: any[];
  timestamp: string;
}

/**
 * Subscribes to ClickUp updates using polling from the backend.
 * This is a fallback since Firebase is not available.
 */
export function subscribeToClickUpUpdates(callback: (updates: ClickUpUpdate[]) => void) {
  let lastData = "";

  const poll = async () => {
    try {
      const response = await fetch('/api/clickup/updates');
      if (response.ok) {
        const data = await response.json();
        const dataString = JSON.stringify(data);
        
        // Only trigger callback if data changed
        if (dataString !== lastData) {
          lastData = dataString;
          callback(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ClickUp updates:", error);
    }
  };

  // Initial fetch
  poll();

  // Set up polling interval
  const intervalId = setInterval(poll, 5000); // Poll every 5 seconds

  return () => clearInterval(intervalId);
}
