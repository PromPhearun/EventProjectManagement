import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { event, task_id, payload } = req.body;

    // Use payload from ClickUp webhook if available, otherwise fallback to root body
    const taskData = payload || req.body;
    
    const taskId = taskData?.id || task_id || req.body?.task_id || "Unknown ID";
    const taskName = taskData?.name || "Unknown Task";
    
    // Assignees is usually an array in ClickUp
    const assignees = Array.isArray(taskData?.assignees) 
      ? taskData.assignees.map((a: any) => a.username || a.user?.username || "Unknown").join(', ') 
      : 'No Assignee';
    
    // Creator object
    const creator = taskData?.creator ? (taskData.creator.username || taskData.creator.user?.username || 'Unknown') : 'Unknown Creator';

    const eventName = event || req.body?.event || 'Unknown Event';

    console.log('--- ClickUp Webhook Received ---');
    console.log(`Event: ${eventName}`);
    console.log(`Task ID: ${taskId}`);
    console.log(`Task Name: ${taskName}`);
    console.log(`Assignee: ${assignees}`);
    console.log(`Creator: ${creator}`);
    console.log('--------------------------------');

    // Respond to ClickUp
    return res.status(200).json({ status: 'ok', message: 'Webhook received' });
  } catch (error) {
    console.error('Error parsing ClickUp webhook:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
