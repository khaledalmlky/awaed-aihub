import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Search, Plus, Calendar, User, Tag, Edit, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

interface KnowledgeItem {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
}

const categories = ['الكل', 'حملات', 'محتوى', 'تحسين', 'تقني', 'عام'];

export default function KnowledgeBase() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    tags: '',
  });

  const fetchKnowledge = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/knowledge');
      if (!response.ok) throw new Error('فشل في جلب البيانات');
      const data = await response.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.includes(searchQuery) ||
      item.content.includes(searchQuery) ||
      item.tags.some((tag) => tag.includes(searchQuery));
    const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.content) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      const body = {
        title: formData.title,
        category: formData.category,
        content: formData.content,
        tags: tagsArray,
        createdBy: user?.name || 'مجهول',
      };

      let response;
      if (editingItem) {
        response = await fetch(`/api/knowledge/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل في حفظ البيانات');
      }

      setIsDialogOpen(false);
      setFormData({ title: '', category: '', content: '', tags: '' });
      setEditingItem(null);
      fetchKnowledge();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      content: item.content,
      tags: item.tags.join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('فشل في حذف العنصر');
      }

      fetchKnowledge();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openNewDialog = () => {
    setEditingItem(null);
    setFormData({ title: '', category: '', content: '', tags: '' });
    setIsDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-8 lg:space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-xl">
              <BookOpen className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">قاعدة المعرفة</h1>
              <p className="text-muted-foreground text-lg mt-2">ذاكرة الفريق من التجارب والمعلومات</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openNewDialog}
                  className="bg-gradient-to-l from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                  data-testid="button-add-knowledge"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة معرفة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'تعديل العنصر' : 'إضافة معرفة جديدة'}</DialogTitle>
                  <DialogDescription>
                    أضف معلومات جديدة لتغذية الذكاء الاصطناعي في معيار عوائد
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label>العنوان *</Label>
                    <Input
                      placeholder="مثال: أفضل أوقات النشر في رمضان"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      data-testid="input-knowledge-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التصنيف *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger data-testid="select-knowledge-category">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="حملات">حملات</SelectItem>
                        <SelectItem value="محتوى">محتوى</SelectItem>
                        <SelectItem value="تحسين">تحسين</SelectItem>
                        <SelectItem value="تقني">تقني</SelectItem>
                        <SelectItem value="عام">عام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المحتوى *</Label>
                    <Textarea
                      placeholder="اكتب المعلومات أو الدروس المستفادة..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="min-h-[150px]"
                      data-testid="textarea-knowledge-content"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوسوم (مفصولة بفاصلة)</Label>
                    <Input
                      placeholder="مثال: رمضان, انستقرام, تفاعل"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      data-testid="input-knowledge-tags"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-to-l from-violet-500 to-purple-500"
                    data-testid="button-save-knowledge"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      editingItem ? 'تحديث' : 'حفظ'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <p>{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في قاعدة المعرفة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-card/50"
              data-testid="input-search-knowledge"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'bg-primary' : ''}
                data-testid={`button-category-${cat}`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground">
              {items.length === 0
                ? 'لا توجد معلومات في قاعدة المعرفة بعد'
                : 'لا توجد نتائج مطابقة للبحث'}
            </p>
            {isAdmin && items.length === 0 && (
              <Button
                onClick={openNewDialog}
                className="mt-4 bg-gradient-to-l from-violet-500 to-purple-500"
              >
                <Plus className="w-4 h-4 ml-2" />
                أضف أول معلومة
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass border-0 h-full" data-testid={`card-knowledge-${item.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline">{item.category}</Badge>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8 p-0"
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.createdBy}
                      </div>
                    </div>

                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            <Tag className="w-2 h-2 ml-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
