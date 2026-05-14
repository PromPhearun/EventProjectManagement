import { useState, useEffect } from 'react';
import { EventProject, Reconciliation, Invoice } from '../types';
import { db } from '../services/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Upload, FileCheck, Download, Trash2, CheckCircle2, TrendingDown, TrendingUp, Receipt, Share2, Slack, Database, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseInvoice } from '../services/gemini';
import { integrationService } from '../services/integrations';

interface ReconciliationTabProps {
  project: EventProject;
  onUpdate: (project: EventProject) => void;
}

export function ReconciliationTab({ project, onUpdate }: ReconciliationTabProps) {
  const [reconciliation, setReconciliation] = useState<Reconciliation>(
    project.reconciliation || {
      id: Math.random().toString(36).substr(2, 9),
      finalBudgetTotal: 0,
      variance: 0,
      invoices: [],
      isFinalized: false
    }
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingSage, setIsSyncingSage] = useState(false);
  const [notifiedInvoices, setNotifiedInvoices] = useState<string[]>([]);

  const isOverdue = (eventEndDate: string) => {
    const end = new Date(eventEndDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - end.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 5 && now > end;
  };

  useEffect(() => {
    // Recalculate variance whenever invoices or estimated budget changes
    const totalActual = reconciliation.invoices.reduce((acc, inv) => acc + inv.amount, 0);
    const estimatedTotal = project.budget?.total || 0;
    const variance = totalActual - estimatedTotal;
    
    setReconciliation(prev => ({
      ...prev,
      finalBudgetTotal: totalActual,
      variance
    }));
  }, [reconciliation.invoices, project.budget?.total]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const data = await parseInvoice(base64, file.type);
        const newInvoice: Invoice = {
          id: Math.random().toString(36).substr(2, 9),
          vendorName: data.vendorName || "Unknown Vendor",
          amount: data.totalAmount || 0,
          currency: data.currency || "USD",
          date: new Date().toISOString(),
          fileName: file.name,
          status: 'pending'
        };

        const updatedRec = {
          ...reconciliation,
          invoices: [...reconciliation.invoices, newInvoice]
        };
        
        setReconciliation(updatedRec);
        onUpdate({ ...project, reconciliation: updatedRec });
        toast.success(`Receipt from ${data.vendorName} processed.`);
      } catch (err) {
        toast.error('AI could not parse the receipt. Adding manual entry.');
        // Manual fallback if desired, for now just error
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const markAsSubmitted = (invoiceId: string) => {
    const updatedInvoices = reconciliation.invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status: 'submitted' as const } : inv
    );
    const updatedRec = { ...reconciliation, invoices: updatedInvoices };
    setReconciliation(updatedRec);
    onUpdate({ ...project, reconciliation: updatedRec });
    toast.success('Document marked as submitted to Finance.');
  };

  const deleteInvoice = (invoiceId: string) => {
    const updatedInvoices = reconciliation.invoices.filter(inv => inv.id !== invoiceId);
    const updatedRec = { ...reconciliation, invoices: updatedInvoices };
    setReconciliation(updatedRec);
    onUpdate({ ...project, reconciliation: updatedRec });
  };

  const finalizeReconciliation = async () => {
    const updatedRec = { ...reconciliation, isFinalized: true };
    setReconciliation(updatedRec);
    onUpdate({ ...project, status: 'completed', reconciliation: updatedRec });
    
    // Auto-Log activity for Manager
    db.logActivity({
      id: Math.random().toString(36).substr(2, 9),
      epmName: db.getCurrentUser().name,
      action: 'Finalized Project Recon',
      timestamp: new Date().toISOString(),
      details: `Event "${project.title}" was reconciled with ${reconciliation.invoices.length} invoices.`
    });

    // Notify Slack
    await integrationService.notifySlack('finance-approvals', `Final Budget Recon for "${project.title}" is ready. Total Spend: ${reconciliation.finalBudgetTotal} ${project.budget?.currency}`);
    
    toast.success('Project finalized and closed.');
  };

  const notifyForSage = async (invoiceId: string) => {
    const invoice = reconciliation.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    await integrationService.notifySlack('finance-approvals', 
      `ALERT: Invoice from ${invoice.vendorName} (${invoice.amount} ${invoice.currency}) for project "${project.title}" is ready for Sage Intacct upload. Requesting upload from ${db.getCurrentUser().name}.`
    );
    setNotifiedInvoices(prev => [...prev, invoiceId]);
    toast.info('Finance team notified via Slack.');
  };

  const syncInvoiceToSage = async (invoiceId: string) => {
    const invoice = reconciliation.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    setIsSyncingSage(true);
    try {
      const sageId = await integrationService.syncToSageIntacct(invoice);
      const updatedInvoices = reconciliation.invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'sage_uploaded' as const, sageIntacctId: sageId } : inv
      );
      const updatedRec = { ...reconciliation, invoices: updatedInvoices };
      setReconciliation(updatedRec);
      onUpdate({ ...project, reconciliation: updatedRec });
      
      // Update ClickUp status
      if (project.clickUpId) {
        integrationService.updateClickUp(project.clickUpId, 'Invoiced');
      }
      
      // Log to Spreadsheet
      integrationService.syncToSpreadsheet({ event: project.title, invoice: sageId, status: 'Sage Uploaded' });

      // Notify Slack of completion
      integrationService.notifySlack('finance-approvals', 
        `SUCCESS: Invoice ${invoice.vendorName} for "${project.title}" has been successfully uploaded to Sage Intacct (ID: ${sageId}) by ${db.getCurrentUser().name}.`
      );

    } catch (err) {
      toast.error('Failed to sync with Sage Intacct.');
    } finally {
      setIsSyncingSage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Post-Event Reconciliation</h2>
          <p className="text-muted-foreground text-sm">Collect receipts, finalize actual spend, and submit for clearance.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download size={14} /> Export Report
            </Button>
            <Button 
                size="sm" 
                className="bg-black text-white gap-2" 
                onClick={finalizeReconciliation}
                disabled={reconciliation.isFinalized}
            >
              <CheckCircle2 size={14} /> {reconciliation.isFinalized ? 'Finalized' : 'Finalize & Close Project'}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
           <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50">
             <div>
               <CardTitle className="text-sm flex items-center gap-2"><Receipt size={16} /> Collected Evidence</CardTitle>
               <CardDescription>Upload all invoices and receipts from suppliers.</CardDescription>
             </div>
             <div className="relative">
                <Button variant="outline" size="sm" className="gap-2" disabled={isUploading}>
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Add Receipt
                </Button>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={reconciliation.isFinalized}
                />
             </div>
           </CardHeader>
           <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Document</TableHead>
                   <TableHead>Vendor</TableHead>
                   <TableHead>Amount</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Action</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {reconciliation.invoices.map((inv) => (
                   <TableRow key={inv.id}>
                     <TableCell className="max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          <FileCheck size={14} className="text-blue-500" />
                          <span className="text-xs truncate">{inv.fileName}</span>
                        </div>
                     </TableCell>
                     <TableCell className="text-xs font-bold">{inv.vendorName}</TableCell>
                     <TableCell className="font-mono text-xs">{inv.amount.toLocaleString()} {inv.currency}</TableCell>
                     <TableCell>
                        <Badge variant={inv.status === 'submitted' ? 'default' : (inv.status === 'sage_uploaded' ? 'success' : 'outline')} className="text-[9px] h-5 px-1.5 min-w-[80px] justify-center">
                          {inv.status.toUpperCase().replace('_', ' ')}
                        </Badge>
                     </TableCell>
                     <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {inv.status !== 'sage_uploaded' && (
                            <>
                              {!notifiedInvoices.includes(inv.id) ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] bg-slate-50 border-slate-200" 
                                  onClick={() => notifyForSage(inv.id)}
                                >
                                  <Slack size={12} className="mr-1" /> Notify Slack
                                </Button>
                              ) : (
                                <Badge variant="outline" className="h-7 text-[10px] border-amber-200 text-amber-600 bg-amber-50">
                                   Notified Finance
                                </Badge>
                              )}
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700" 
                                onClick={() => syncInvoiceToSage(inv.id)} 
                                disabled={isSyncingSage}
                              >
                                <Database size={12} className="mr-1" /> Mark Sage Upload
                              </Button>
                            </>
                          )}
                          {inv.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => markAsSubmitted(inv.id)}>
                              <CheckCircle2 size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteInvoice(inv.id)} disabled={reconciliation.isFinalized}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                     </TableCell>
                   </TableRow>
                 ))}
                 {reconciliation.invoices.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-10 opacity-30 italic text-sm">
                       No receipts uploaded for this event.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
        </Card>

        <div className="space-y-6">
           {isOverdue(project.endDate) && (
             <Card className="bg-red-50 border-red-200 border">
                <CardContent className="pt-6">
                   <div className="flex items-start gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={20} />
                      <div>
                         <p className="text-sm font-black text-red-900 leading-tight">5-DAY COLLECTION WARNING</p>
                         <p className="text-xs text-red-700 mt-1">This event ended more than 5 days ago. All supplier invoices should have been finalized and uploaded to Sage Intacct by now.</p>
                      </div>
                   </div>
                </CardContent>
             </Card>
           )}
           <Card className="bg-slate-900 text-white border-none">
             <CardHeader>
               <CardTitle className="text-xs font-bold uppercase opacity-50">Budget Performance</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div>
                  <p className="text-[10px] opacity-60">ACTUAL SPEND</p>
                  <p className="text-3xl font-black">{reconciliation.finalBudgetTotal.toLocaleString()} {project.budget?.currency}</p>
               </div>
               <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] opacity-60">ESTIMATED</p>
                    <p className="text-sm font-bold">{project.budget?.total.toLocaleString()} {project.budget?.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] opacity-60">VARIANCE</p>
                    <div className={`flex items-center gap-1 font-bold ${reconciliation.variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {reconciliation.variance > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(reconciliation.variance).toLocaleString()}
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>

            <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase opacity-50">Sage Intacct Status</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                   <p className="opacity-60 text-[10px]">Synced Docs</p>
                   <p className="font-bold">{reconciliation.invoices.filter(i => i.status === 'sage_uploaded').length} / {reconciliation.invoices.length}</p>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div 
                      className="bg-green-500 h-full transition-all" 
                      style={{ width: `${(reconciliation.invoices.filter(i => i.status === 'sage_uploaded').length / (reconciliation.invoices.length || 1)) * 100}%` }} 
                   />
                </div>
                <Button variant="outline" className="w-full gap-2 text-xs border-slate-200" onClick={() => integrationService.notifySlack('epm-team', `Need manual check for ${project.title} invoices in Sage.`)}>
                   <Slack size={14} /> Notify Slack Channel
                </Button>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase opacity-50 font-black">Platform IDs</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                   <span className="text-[10px] uppercase opacity-40">ClickUp</span>
                   <span className="text-[10px] font-mono font-bold flex items-center gap-1"><LinkIcon size={10} /> {project.clickUpId || 'Unlinked'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                   <span className="text-[10px] uppercase opacity-40">Spreadsheet</span>
                   <span className="text-[10px] font-mono font-bold flex items-center gap-1"><LinkIcon size={10} /> Master_Log.xlsx</span>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}
