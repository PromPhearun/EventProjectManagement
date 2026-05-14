import { Supplier } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Star, MapPin, ExternalLink, MessageSquare, Sparkles, Search } from "lucide-react";
import { useState } from "react";
import { generateSupplierAIInsight } from "../services/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import Markdown from "react-markdown";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface SupplierDirectoryProps {
  suppliers: Supplier[];
}

export function SupplierDirectory({ suppliers }: SupplierDirectoryProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAIInsight = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setLoading(true);
    setInsight(null);
    setIsInsightOpen(true);
    try {
      const result = await generateSupplierAIInsight(supplier);
      setInsight(result);
    } catch (error) {
      toast.error("Failed to generate AI Insight");
      setIsInsightOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers & Partners</h2>
          <p className="text-muted-foreground">Historical list of verified vendors with team reviews.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Search name, category, or location..." 
            className="pl-10 h-11 rounded-xl bg-card shadow-sm border-border focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Key Criteria</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      {s.website && (
                        <a href={s.website} target="_blank" className="text-[10px] text-blue-600 flex items-center gap-0.5">
                          {s.website} <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{s.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-70">
                      <MapPin size={12} /> {s.city}, {s.country}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="font-bold">{s.rating}</span>
                      <span className="text-[10px] opacity-40">({s.reviews.length} reviews)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.criteria.map(c => (
                        <span key={c} className="text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border text-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 px-4 gap-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 font-bold border-2 border-transparent hover:border-amber-500/20 rounded-xl" 
                        onClick={() => handleAIInsight(s)}
                      >
                        <Sparkles size={16} /> AI Summary
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-foreground">
                        <MessageSquare size={14} /> Reviews
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isInsightOpen} onOpenChange={setIsInsightOpen}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-border overflow-hidden p-0 bg-background text-foreground">
          <DialogHeader className="p-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-amber-500" size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Intelligence</span>
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {selectedSupplier?.name} <span className="text-amber-500">Profile Analysis</span>
            </DialogTitle>
          </DialogHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Sparkles className="animate-spin text-amber-500" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">Analyzing reviews and performance data...</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert text-sm font-medium leading-relaxed italic text-foreground">
                <Markdown>{insight || ''}</Markdown>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-muted/30 border-t border-border text-center">
             <p className="text-[9px] uppercase font-black opacity-30">AI Insight derived from historical team feedback.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
