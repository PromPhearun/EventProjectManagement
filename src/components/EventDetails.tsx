import { EventProject } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ArrowLeft, Download, Send, CheckCircle2, DollarSign, Clock, MapPin, Building, Star, AlertCircle, Plane, Hotel, Upload, Trash2, Plus, Globe, FileText, Mail, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { ApprovalTemplateTab } from "./ApprovalTemplateTab";
import { ReconciliationTab } from "./ReconciliationTab";
import { ExternalComms } from "./ExternalComms";
import { travelPerkService, TravelOption } from "../services/travelPerk";
import { parseInvoice, detectBudgetVariance } from "../services/gemini";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";

interface EventDetailsProps {
  project: EventProject;
  onBack: () => void;
  onUpdate: (project: EventProject) => void;
}

export function EventDetails({ project, onBack, onUpdate }: EventDetailsProps) {
  const [isSearchingTravel, setIsSearchingTravel] = useState(false);
  const [travelOptions, setTravelOptions] = useState<TravelOption[]>([]);
  const [isParsingInvoice, setIsParsingInvoice] = useState(false);
  const [isCheckingVariance, setIsCheckingVariance] = useState(false);
  const [budgetWarnings, setBudgetWarnings] = useState<string | null>(null);

  const handleItineraryChange = (dayIdx: number, activityIdx: number, field: string, value: string) => {
    if (!project.itinerary) return;
    const newItinerary = { ...project.itinerary };
    (newItinerary.days[dayIdx].activities[activityIdx] as any)[field] = value;
    onUpdate({ ...project, itinerary: newItinerary });
  };

  const handleBudgetChange = (idx: number, field: string, value: string | number) => {
    if (!project.budget) return;
    const newBudget = { ...project.budget };
    (newBudget.items[idx] as any)[field] = value;
    newBudget.total = newBudget.items.reduce((acc, item) => acc + item.estimatedCost, 0);
    onUpdate({ ...project, budget: newBudget });
  };

  const addBudgetItem = () => {
    if (!project.budget) return;
    const newItem = { id: Math.random().toString(36).substr(2, 9), category: 'NEW', description: 'New service', estimatedCost: 0 };
    onUpdate({ ...project, budget: { ...project.budget, items: [...project.budget.items, newItem] } });
  };

  const searchTravel = async () => {
    setIsSearchingTravel(true);
    try {
      const flights = await travelPerkService.searchFlights('London', project.city, project.startDate);
      const hotels = await travelPerkService.searchHotels(project.city, project.startDate, project.endDate);
      setTravelOptions([...flights, ...hotels]);
      toast.success('TravelPerk data retrieved successfully');
    } catch (error) {
      toast.error('Failed to connect to TravelPerk');
    } finally {
      setIsSearchingTravel(false);
    }
  };

  const checkVariance = async () => {
    setIsCheckingVariance(true);
    try {
      const result = await detectBudgetVariance(project);
      setBudgetWarnings(result);
      if (result && !result.includes("optimized")) {
        toast.warning("AI Budget Variance Detected");
      } else {
        toast.success("Budget Audit Complete");
      }
    } catch (error) {
      toast.error("Variance check failed");
    } finally {
      setIsCheckingVariance(false);
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingInvoice(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const data = await parseInvoice(base64, file.type);
        toast.success(`Parsed invoice from ${data.vendorName}`);
        
        // Add to budget
        if (project.budget) {
          const newItems = [...project.budget.items];
          data.items.forEach((item: any) => {
            newItems.push({
              id: Math.random().toString(36).substr(2, 9),
              category: 'SUPPLIER',
              description: `${data.vendorName}: ${item.description}`,
              estimatedCost: item.cost
            });
          });
          const total = newItems.reduce((acc, i) => acc + i.estimatedCost, 0);
          onUpdate({ ...project, budget: { ...project.budget, items: newItems, total } });
        }
      } catch (err) {
        toast.error('Failed to parse invoice');
      } finally {
        setIsParsingInvoice(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitToLead = () => {
    const existingTemplate = project.approvalTemplate || {
      id: Math.random().toString(36).substr(2, 9),
      tripLeadName: '',
      tripLeadSection: '',
      epmSection: '',
      budgetStatus: 'draft',
      itineraryStatus: 'draft',
      sharedWith: [],
      lastUpdated: new Date().toISOString()
    };

    const updatedTemplate = {
      ...existingTemplate,
      budgetStatus: 'under_review' as const,
      itineraryStatus: 'under_review' as const,
      lastUpdated: new Date().toISOString()
    };

    const updatedProject = {
      ...project,
      status: 'pending' as const,
      approvalTemplate: updatedTemplate
    };

    onUpdate(updatedProject);
    toast.success('Project details and approval template submitted to Team Lead for review!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={searchTravel} disabled={isSearchingTravel}>
            <Globe size={16} /> {isSearchingTravel ? 'Querying TravelPerk...' : 'Sync TravelPerk'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download size={16} /> Export PDF
          </Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleSubmitToLead}>
            <Send size={16} /> Submit to Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-4xl font-black tracking-tighter uppercase">{project.title}</h2>
              <Select 
                value={project.status} 
                onValueChange={(val: any) => onUpdate({ ...project, status: val })}
              >
                <SelectTrigger className="w-[180px] h-8 font-black uppercase tracking-tight text-[10px] rounded-full border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="drafted">Drafted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="reconciling">Reconciling</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-6 text-muted-foreground">
              <div className="flex items-center gap-1"><MapPin size={16} /> {project.city}, {project.country}</div>
              <div className="flex items-center gap-1"><Clock size={16} /> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</div>
            </div>
          </div>

          <Tabs defaultValue="itinerary" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-muted/20 border border-border">
              <TabsTrigger value="itinerary" className="gap-2 text-[10px] uppercase font-bold text-foreground"><Clock size={16} /> Itinerary</TabsTrigger>
              <TabsTrigger value="budget" className="gap-2 text-[10px] uppercase font-bold text-foreground"><DollarSign size={16} /> Budget</TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-2 text-[10px] uppercase font-bold text-foreground"><Building size={16} /> Suggestions</TabsTrigger>
              <TabsTrigger value="comms" className="gap-2 text-[10px] uppercase font-bold text-foreground"><Mail size={16} /> Comms</TabsTrigger>
              <TabsTrigger value="approval" className="gap-2 text-[10px] uppercase font-bold text-foreground"><FileText size={16} /> Approval</TabsTrigger>
              <TabsTrigger value="recon" className="gap-2 text-[10px] uppercase font-bold text-foreground"><CheckCircle2 size={16} /> Recon</TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2 text-[10px] uppercase font-bold text-foreground"><Star size={16} /> Feedback</TabsTrigger>
            </TabsList>
            
            <TabsContent value="itinerary" className="mt-6 space-y-6">
              {project.itinerary?.days.map((day, dIdx) => (
                <Card key={day.dayNumber} className="border-border bg-card">
                  <CardHeader className="bg-muted/30 border-b border-border py-3 flex flex-row justify-between items-center">
                    <CardTitle className="text-sm text-foreground">DAY {day.dayNumber}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] border-border text-foreground">EDITABLE</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {day.activities.map((activity, aIdx) => (
                          <TableRow key={activity.id || `activity-${dIdx}-${aIdx}`} className="border-border hover:bg-muted/10">
                            <TableCell className="w-32 border-r border-border p-2">
                               <Input 
                                className="h-8 text-xs font-mono font-bold border-none bg-transparent text-foreground"
                                value={activity.time}
                                onChange={(e) => handleItineraryChange(dIdx, aIdx, 'time', e.target.value)}
                               />
                            </TableCell>
                            <TableCell className="p-2 space-y-1">
                               <Input 
                                className="h-8 font-medium border-none bg-transparent text-foreground"
                                value={activity.description}
                                onChange={(e) => handleItineraryChange(dIdx, aIdx, 'description', e.target.value)}
                               />
                               <div className="flex items-center gap-2 px-2">
                                 <MapPin size={10} className="text-muted-foreground" />
                                 <Input 
                                  className="h-6 text-[10px] text-muted-foreground border-none bg-transparent italic"
                                  value={activity.location}
                                  onChange={(e) => handleItineraryChange(dIdx, aIdx, 'location', e.target.value)}
                                 />
                               </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="budget" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center bg-primary/10 p-3 rounded-2xl border border-primary/20">
                  <div className="flex items-center gap-2 text-primary">
                    <Upload size={18} />
                    <div>
                      <p className="text-xs font-bold uppercase">Invoice Processing</p>
                      <p className="text-[10px] opacity-70">Upload PDF/Image to auto-populate</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Button size="sm" variant="outline" className="bg-background h-8 border-border text-foreground hover:bg-accent" disabled={isParsingInvoice}>
                      {isParsingInvoice ? 'Analyzing...' : 'Upload'}
                    </Button>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*,.pdf"
                      onChange={handleInvoiceUpload}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Sparkles size={18} className={isCheckingVariance ? "animate-pulse" : ""} />
                    <div>
                      <p className="text-xs font-bold uppercase">Variance Detection</p>
                      <p className="text-[10px] opacity-70">AI Budget Compliance Scan</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-background h-8 text-amber-500 border-amber-500/20 hover:bg-amber-500/10" 
                    onClick={checkVariance}
                    disabled={isCheckingVariance}
                  >
                    {isCheckingVariance ? 'Scanning...' : 'Run Audit'}
                  </Button>
                </div>
              </div>

              {budgetWarnings && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex gap-2 mb-2">
                      <AlertCircle className="text-amber-500" size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">AI Financial Audit</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert italic text-foreground leading-relaxed font-medium">
                      <Markdown>{budgetWarnings}</Markdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-2xl border border-border shadow-sm bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Category</TableHead>
                      <TableHead className="text-foreground">Description</TableHead>
                      <TableHead className="text-right text-foreground">Est. Cost</TableHead>
                      <TableHead className="w-10 text-foreground"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.budget?.items.map((item, idx) => (
                      <TableRow key={item.id || `budget-item-${idx}`} className="border-border hover:bg-muted/10">
                        <TableCell className="w-32">
                          <Input 
                            className="h-8 text-[10px] font-bold uppercase opacity-60 border-none bg-transparent text-foreground"
                            value={item.category}
                            onChange={(e) => handleBudgetChange(idx, 'category', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            className="h-8 border-none bg-transparent text-foreground"
                            value={item.description}
                            onChange={(e) => handleBudgetChange(idx, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium w-40">
                          <div className="flex items-center justify-end gap-2">
                            <Input 
                              type="number"
                              className="h-8 text-right font-mono bg-muted/20 border-border w-24 text-foreground"
                              value={item.estimatedCost}
                              onChange={(e) => handleBudgetChange(idx, 'estimatedCost', parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[10px] opacity-40 uppercase text-foreground">{project.budget?.currency}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive hover:text-destructive/80"
                            onClick={() => {
                              if (!project.budget) return;
                              const newItems = project.budget.items.filter((_, i) => i !== idx);
                              const total = newItems.reduce((acc, i) => acc + i.estimatedCost, 0);
                              onUpdate({ ...project, budget: { ...project.budget, items: newItems, total } });
                            }}
                          >
                             <Trash2 size={12} />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow key="add-button-row" className="border-border">
                      <TableCell colSpan={4} className="p-0">
                        <Button variant="ghost" className="w-full rounded-none h-10 gap-2 text-xs opacity-50 hover:opacity-100 text-foreground" onClick={addBudgetItem}>
                          <Plus size={14} /> Add Line Item
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow key="total-row" className="bg-muted/30 border-t-2 border-border">
                      <TableCell colSpan={2} className="text-right font-bold py-4 text-foreground">TOTAL ESTIMATED</TableCell>
                      <TableCell colSpan={2} className="text-right font-mono font-black text-lg py-4 px-4 text-foreground">
                        {project.budget?.total.toLocaleString()} {project.budget?.currency}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="suppliers" className="mt-6 space-y-6">
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-base">Expert Selection Rules</CardTitle>
                  <CardDescription className="text-amber-700/70">
                    For {project.type} events, we prioritize vendors with specialized {project.type} experience and strong volume discounts.
                  </CardDescription>
                </CardHeader>
              </Card>
              
              {travelOptions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" /> TravelPerk Real-time Data
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {travelOptions.map((option, oIdx) => (
                      <Card key={option.id || `option-${oIdx}`} className="border-l-4 border-l-blue-500">
                        <CardHeader className="py-3 px-4 flex flex-row justify-between items-start">
                          <div>
                            <CardTitle className="text-sm flex items-center gap-2">
                              {option.type === 'flight' ? <Plane size={14} /> : <Hotel size={14} />}
                              {option.provider}
                            </CardTitle>
                            <CardDescription className="text-[10px]">{option.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-sm">{option.price} {option.currency}</p>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 px-0" onClick={() => {
                               if (!project.budget) return;
                               const newItem = { 
                                 id: Math.random().toString(36).substr(2, 9), 
                                 category: option.type.toUpperCase(), 
                                 description: `${option.provider}: ${option.description}`, 
                                 estimatedCost: option.price 
                               };
                               onUpdate({ ...project, budget: { ...project.budget, items: [...project.budget.items, newItem], total: project.budget.total + option.price } });
                               toast.success('Added to budget');
                            }}>
                               Add to Budget
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mock suggestions */}
                <Card className="border-2 border-dashed border-black/5 flex flex-col items-center justify-center py-10 opacity-40">
                   <Building size={24} className="mb-2" />
                   <p className="text-xs font-bold uppercase tracking-widest">Loading AI Recommendations...</p>
                </Card>
                <Card className="border-2 border-dashed border-black/5 flex flex-col items-center justify-center py-10 opacity-40">
                   <AlertCircle size={24} className="mb-2" />
                   <p className="text-xs font-bold uppercase tracking-widest">Analyzing Historical Data...</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="comms" className="mt-6">
              <ExternalComms project={project} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="approval" className="mt-6">
               <ApprovalTemplateTab project={project} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="recon" className="mt-6">
               <ReconciliationTab project={project} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="feedback" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Performance Audit</CardTitle>
                  <CardDescription>Review Team Lead remarks and self-reflection for this event.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {project.tlFeedback ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-2">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold uppercase text-amber-500">Team Lead Remark</span>
                           <span className="font-bold text-amber-500">{project.tlFeedback.tlRating}/5 Stars</span>
                         </div>
                         <p className="text-sm italic opacity-90 text-foreground">"{project.tlFeedback.tlRemark}"</p>
                       </div>
                       <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-2">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold uppercase text-primary">Member Reflection</span>
                           <span className="font-bold text-primary">{project.tlFeedback.memberRating}/5 Stars</span>
                         </div>
                         <p className="text-sm italic opacity-90 text-foreground">"{project.tlFeedback.memberReflection}"</p>
                       </div>
                       {project.tlFeedback.managerRemark && (
                         <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 space-y-2 md:col-span-2 lg:col-span-1">
                           <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-indigo-500">Manager Strategic Note</span>
                             <span className="font-bold text-indigo-500">{project.tlFeedback.managerRating}/5 Stars</span>
                           </div>
                           <p className="text-sm italic opacity-90 text-foreground">"{project.tlFeedback.managerRemark}"</p>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed rounded-xl opacity-30 flex flex-col items-center gap-2">
                      <AlertCircle size={24} />
                      <p className="text-sm font-medium">Feedback not started or project yet to be completed.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase font-bold text-muted-foreground">Team Lead Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-xs italic">
                "Go ahead with the draft. Ensure we have fallback AV suppliers." - Team Lead
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1">
                <CheckCircle2 size={12} /> Approved to proceed
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase font-bold text-muted-foreground">Original Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed opacity-80 italic">
                "{project.criteria}"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
