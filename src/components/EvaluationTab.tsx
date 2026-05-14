import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Supplier, TeamFeedback, EventProject } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Star, MessageSquare, Award, User, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

export function EvaluationTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [feedbacks, setFeedbacks] = useState<TeamFeedback[]>([]);
  const [activeTab, setActiveTab] = useState<'supplier' | 'self'>('supplier');
  
  const [formData, setFormData] = useState({
    targetId: '',
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    setSuppliers(db.getSuppliers());
    setProjects(db.getProjects());
    setFeedbacks(db.getFeedback());
  }, []);

  const handleSubmit = () => {
    if (!formData.targetId || !formData.comment) {
      toast.error('Please select a target and leave a comment');
      return;
    }

    const newFeedback: TeamFeedback = {
      id: Math.random().toString(36).substr(2, 9),
      targetId: formData.targetId,
      type: activeTab,
      rating: formData.rating,
      comment: formData.comment,
      author: db.getCurrentUser().name,
      date: new Date().toISOString()
    };

    db.saveFeedback(newFeedback);
    setFeedbacks([...feedbacks, newFeedback]);
    setFormData({ targetId: '', rating: 5, comment: '' });
    toast.success('Evaluation submitted!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">EPM Feedback Hub</h2>
          <p className="text-muted-foreground">Log your experiences with suppliers and reflect on your own project performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Submit Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex p-1 bg-muted rounded-md shrink-0">
                <button 
                  onClick={() => setActiveTab('supplier')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1 ${activeTab === 'supplier' ? 'bg-white shadow' : 'opacity-60'}`}
                >
                  <Building size={12} /> Supplier
                </button>
                <button 
                   onClick={() => setActiveTab('self')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1 ${activeTab === 'self' ? 'bg-white shadow' : 'opacity-60'}`}
                >
                  <User size={12} /> Self
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase opacity-50">
                  {activeTab === 'supplier' ? 'Select Supplier' : 'Select Event'}
                </label>
                <Select value={formData.targetId} onValueChange={id => setFormData({...formData, targetId: id})}>
                  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent>
                    {activeTab === 'supplier' 
                      ? suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                      : projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase opacity-50">Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button 
                      key={n}
                      onClick={() => setFormData({...formData, rating: n})}
                      className={`p-2 rounded border transition-all ${formData.rating >= n ? 'bg-yellow-50 border-yellow-400 text-yellow-600' : 'bg-white text-slate-300'}`}
                    >
                      <Star className={formData.rating >= n ? "fill-yellow-400" : ""} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase opacity-50">Comments & Learnings</label>
                <Textarea 
                  placeholder={activeTab === 'supplier' ? "How was their delivery?" : "What did you learn from this project?"} 
                  value={formData.comment}
                  onChange={e => setFormData({...formData, comment: e.target.value})}
                  className="min-h-[120px]"
                />
              </div>

              <Button className="w-full" onClick={handleSubmit}>Submit Review</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold">Recent Evaluations</h3>
          </div>

          <div className="space-y-4">
            {feedbacks.slice().reverse().map((f) => {
              const targetName = f.type === 'supplier' 
                ? suppliers.find(s => s.id === f.targetId)?.name 
                : projects.find(p => p.id === f.targetId)?.title;

              return (
                <Card key={f.id} className="overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={f.type === 'supplier' ? 'bg-blue-50' : 'bg-purple-50'}>
                        {f.type}
                      </Badge>
                      <span className="font-medium">{targetName || 'Deleted Entity'}</span>
                    </div>
                    <span className="opacity-50">{new Date(f.date).toLocaleDateString()}</span>
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex gap-1 mb-2">
                      {[1,2,3,4,5].map(n => (
                        <Star 
                          key={n} 
                          size={12} 
                          className={f.rating >= n ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} 
                        />
                      ))}
                    </div>
                    <p className="text-sm opacity-80 leading-relaxed italic">"{f.comment}"</p>
                    <div className="mt-3 text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <User size={10} /> {f.author}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {feedbacks.length === 0 && (
              <div className="py-20 text-center opacity-30 italic">No feedback entries found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
