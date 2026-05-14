import { toast } from "sonner";

/**
 * Mock Integration Service for External Workflows
 */

export const integrationService = {
  async notifySlack(channel: string, message: string) {
    console.log(`[SLACK] Notifying channel ${channel}: ${message}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(`Slack notification sent to #${channel}`);
    return true;
  },

  async updateClickUp(taskId: string, status: string) {
    console.log(`[CLICKUP] Updating task ${taskId} to status ${status}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(`ClickUp task ${taskId} moved to ${status}`);
    return true;
  },

  async syncToSageIntacct(invoiceData: any) {
    console.log(`[SAGE INTACCT] Syncing invoice:`, invoiceData);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const sageId = `SAGE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    toast.success(`Invoice synced to Sage Intacct (ID: ${sageId})`);
    return sageId;
  },

  async syncToSpreadsheet(data: any) {
    console.log(`[EXCEL] Logging activity in Master Spreadsheet:`, data);
    await new Promise(resolve => setTimeout(resolve, 600));
    return true;
  }
};
