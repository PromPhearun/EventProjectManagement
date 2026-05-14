import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { KnowledgeItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Plus, Search, HelpCircle, Info, Trash2, Tag, Calendar as CalendarIcon, User as UserIcon, MessageSquare, Sparkles, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { getKnowledgeAnswer } from '../services/gemini';
import Markdown from 'react-markdown';

export function KnowledgeHub() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newItem, setNewItem] = useState<Partial<KnowledgeItem>>({
    category: 'Q&A',
    title: '',
    content: '',
    tags: []
  });

  const currentUser = db.getCurrentUser();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setItems(db.getKnowledgeItems());
  };

  const handleAdd = () => {
    if (!newItem.title || !newItem.content) {
      toast.error('Please fill in title and content');
      return;
    }

    const item: KnowledgeItem = {
      id: Math.random().toString(36).substr(2, 9),
      category: newItem.category as any,
      title: newItem.title,
      content: newItem.content,
      author: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      tags: newItem.tags || []
    };

    db.saveKnowledgeItem(item);
    refreshData();
    setIsAdding(false);
    setNewItem({ category: 'Q&A', title: '', content: '', tags: [] });
    toast.success('Information added to Knowledge Hub');
  };

  const handleDelete = (id: string) => {
    db.deleteKnowledgeItem(id);
    refreshData();
    toast.info('Item removed');
  };

  const handleAskAi = async () => {
    if (!aiQuery) {
      toast.error("Ask a question first!");
      return;
    }
    setIsAiLoading(true);
    setAiAnswer(null);
    setIsAskingAi(true);
    try {
      const answer = await getKnowledgeAnswer(aiQuery, items, currentUser.role);
      setAiAnswer(answer);
    } catch (error) {
      toast.error("AI Assistant is currently offline");
      setIsAskingAi(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.content.toLowerCase().includes(search.toLowerCase()) ||
                          item.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'qa' && item.category === 'Q&A') ||
                      (activeTab === 'updates' && item.category === 'Company Update');
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 flex items-center gap-3">
            <Info className="text-amber-500" /> Knowledge Hub
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            EPM Collective Intelligence & Strategic Updates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              className="pl-10 rounded-xl border-2 focus:ring-0 focus:border-black font-medium text-xs"
              placeholder="Search knowledge base..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setIsAdding(true)}
            className="rounded-xl bg-black hover:bg-slate-800 font-bold text-xs uppercase gap-2 px-6"
          >
            <Plus size={16} /> Contribute
          </Button>
        </div>
      </header>

      {/* AI Assistant Section */}
      <Card className="border-2 border-amber-100 bg-amber-50/20 rounded-3xl overflow-hidden shadow-lg shadow-amber-500/5">
        <CardHeader className="pb-2 border-b border-amber-100/50 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500 fill-amber-500" size={18} />
            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Deriv EPM AI Assistant</CardTitle>
          </div>
          <CardDescription className="text-xs italic">Ask questions about SOPs, previous event data, or team expertise.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input 
              placeholder="e.g., What is our policy on booking flights for VVIPs?" 
              className="rounded-xl border-amber-200 focus-visible:ring-amber-500 font-medium text-xs h-12 bg-white"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            />
            <Button 
              className="rounded-xl bg-amber-500 hover:bg-amber-600 h-12 px-6 shadow-md"
              disabled={isAiLoading}
              onClick={handleAskAi}
            >
              {isAiLoading ? <Sparkles className="animate-spin" size={18} /> : <Send size={18} />}
            </Button>
          </div>

          {isAskingAi && (
            <div className="mt-4 p-4 rounded-2xl bg-white border border-amber-100 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                <div className="w-5 h-5 bg-black rounded-lg flex items-center justify-center">
                   <Sparkles className="text-white" size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">AI Analysis</span>
              </div>
              {isAiLoading ? (
                <div className="flex gap-1 py-4">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
                </div>
              ) : (
                <div className="prose prose-slate prose-sm max-w-none text-xs font-semibold leading-relaxed italic">
                  <Markdown>{aiAnswer || ''}</Markdown>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                 <Button variant="ghost" size="xs" className="text-[9px] uppercase font-black opacity-30 hover:opacity-100" onClick={() => setIsAskingAi(false)}>Clear Analysis</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-transparent gap-2 p-0 h-auto mb-6">
          <TabsTrigger value="all" className="data-[state=active]:bg-black data-[state=active]:text-white rounded-xl border-2 px-6 py-2 text-xs font-black uppercase transition-all opacity-60 data-[state=active]:opacity-100 italic">
            Global Archive
          </TabsTrigger>
          <TabsTrigger value="qa" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-xl border-2 px-6 py-2 text-xs font-black uppercase transition-all opacity-60 data-[state=active]:opacity-100 italic">
            Team Q&A
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl border-2 px-6 py-2 text-xs font-black uppercase transition-all opacity-60 data-[state=active]:opacity-100 italic">
            Strategic Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <KnowledgeCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="qa" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <KnowledgeCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="updates" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <KnowledgeCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-3xl overflow-hidden border-2 shadow-2xl">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="font-black uppercase tracking-tighter text-xl">Contribute to Hub</CardTitle>
              <CardDescription className="italic">Share knowledge or updates with the EPM team.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Classification</label>
                <div className="flex gap-2">
                  {(['Q&A', 'Company Update'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewItem({...newItem, category: cat})}
                      className={`flex-1 py-3 border-2 rounded-xl font-black text-xs transition-all ${newItem.category === cat ? 'bg-black text-white border-black shadow-lg' : 'bg-white opacity-40 hover:opacity-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Clear Title</label>
                <Input 
                  placeholder="e.g., How to handle visa expedited processing?"
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  className="rounded-xl border-2 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Detailed Content</label>
                <Textarea 
                  placeholder="Provide detailed instructions or the update content..."
                  rows={4}
                  value={newItem.content}
                  onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                  className="rounded-xl border-2 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Tags (comma separated)</label>
                <Input 
                  placeholder="e.g., Visa, Logistics, Dubai"
                  onChange={(e) => setNewItem({...newItem, tags: e.target.value.split(',').map(t => t.trim())})}
                  className="rounded-xl border-2 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl font-black uppercase py-6"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 rounded-xl font-black uppercase py-6 bg-black text-white hover:bg-slate-800 shadow-xl"
                  onClick={handleAdd}
                >
                  Publish Knowledge
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({ item, onDelete }: { item: KnowledgeItem, onDelete: (id: string) => void }) {
  return (
    <Card className={`group relative h-full flex flex-col border-2 transition-all hover:shadow-xl hover:-translate-y-1 rounded-3xl overflow-hidden ${item.category === 'Company Update' ? 'border-blue-100 bg-blue-50/10' : 'border-slate-100'}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.category === 'Company Update' ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
            {item.category}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 rounded-full"
          >
            <Trash2 size={14} />
          </Button>
        </div>
        <CardTitle className="text-lg font-black tracking-tight leading-tight uppercase group-hover:text-amber-500 transition-colors">
          {item.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <p className="text-sm font-medium leading-relaxed text-slate-600 line-clamp-3 italic">
          "{item.content}"
        </p>
        
        <div className="flex flex-wrap gap-1.5 pt-2">
          {item.tags?.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-1">
              <Tag size={8} /> {tag}
            </span>
          ))}
        </div>

        <div className="pt-4 border-t flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
              <UserIcon size={12} className="text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">{item.author}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
             <CalendarIcon size={10} />
             <span className="text-[9px] font-bold font-mono">{item.date}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
