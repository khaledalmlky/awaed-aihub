import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Trash2, Shield, UserCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'team';
  status: 'active' | 'inactive';
  allowedTools: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

const ALL_TOOLS = [
  { id: 'business_analyzer', name: 'محلل الأعمال' },
  { id: 'smart_analyzer', name: 'محلل القنوات' },
  { id: 'campaign_brain', name: 'ملهم الحملات' },
  { id: 'content_studio', name: 'استوديو المحتوى' },
  { id: 'campaign_planner', name: 'مخطط الحملات' },
  { id: 'performance_analyzer', name: 'محلل أداء الحملات' },
];

export default function AdminUsers() {
  const { isAdmin, user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'team' as 'admin' | 'team',
    allowedTools: [] as string[],
  });

  useEffect(() => {
    if (!isAdmin) {
      setLocation('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, setLocation]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في جلب المستخدمين', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.name) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    const username = formData.email.split('@')[0];

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, username }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'تم', description: 'تم إنشاء المستخدم بنجاح' });
        setShowCreateDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في إنشاء المستخدم', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          allowedTools: formData.allowedTools,
          ...(formData.password ? { password: formData.password } : {}),
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'تم', description: 'تم تحديث المستخدم بنجاح' });
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث المستخدم', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'تم', description: newStatus === 'active' ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب' });
        fetchUsers();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'تم', description: 'تم حذف المستخدم' });
        fetchUsers();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المستخدم', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'team',
      allowedTools: [],
    });
    setShowPassword(false);
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      allowedTools: user.allowedTools || [],
    });
  };

  const toggleTool = (toolId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedTools: prev.allowedTools.includes(toolId)
        ? prev.allowedTools.filter(t => t !== toolId)
        : [...prev.allowedTools, toolId],
    }));
  };

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
              <p className="text-muted-foreground">إنشاء وإدارة حسابات الفريق</p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                data-testid="button-create-user"
              >
                <Plus className="w-4 h-4" />
                إضافة مستخدم
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                <DialogDescription>أنشئ حساب جديد لأحد أعضاء الفريق</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أحمد محمد"
                    data-testid="input-user-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ahmed@awaed.com"
                    data-testid="input-user-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      data-testid="input-user-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الدور</Label>
                  <Select value={formData.role} onValueChange={(v: 'admin' | 'team') => setFormData({ ...formData, role: v })}>
                    <SelectTrigger data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">أخصائي تسويق</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'team' && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">الأدوات المسموحة</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {ALL_TOOLS.map(tool => (
                        <div 
                          key={tool.id}
                          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-border/50 bg-card/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleTool(tool.id)}
                        >
                          <span className="text-sm font-medium">{tool.name}</span>
                          <Switch
                            checked={formData.allowedTools.includes(tool.id)}
                            onCheckedChange={() => toggleTool(tool.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-3 sm:gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="min-w-[100px]">إلغاء</Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={isCreating}
                  className="min-w-[140px]"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  data-testid="button-submit-user"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء المستخدم'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`glass border-0 ${user.status === 'inactive' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{user.name}</h3>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? (
                                <><Shield className="w-3 h-3 ml-1" /> مدير</>
                              ) : (
                                <><UserCheck className="w-3 h-3 ml-1" /> أخصائي تسويق</>
                              )}
                            </Badge>
                            {user.status === 'inactive' && (
                              <Badge variant="outline" className="text-red-400 border-red-400/30">معطل</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.role === 'team' && user.allowedTools?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {user.allowedTools.slice(0, 3).map(toolId => {
                                const tool = ALL_TOOLS.find(t => t.id === toolId);
                                return tool ? (
                                  <Badge key={toolId} variant="outline" className="text-xs">
                                    {tool.name}
                                  </Badge>
                                ) : null;
                              })}
                              {user.allowedTools.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.allowedTools.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">أنت</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              className={user.status === 'active' ? 'text-orange-400 hover:text-orange-500' : 'text-green-400 hover:text-green-500'}
                            >
                              {user.status === 'active' ? 'تعطيل' : 'تفعيل'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-500"
                              onClick={() => handleDeleteUser(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {users.length === 0 && (
              <Card className="glass border-0">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا يوجد مستخدمين بعد</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={!!editingUser} onOpenChange={() => { setEditingUser(null); resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل المستخدم</DialogTitle>
              <DialogDescription>تعديل بيانات {editingUser?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة مرور جديدة (اتركها فارغة للإبقاء)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={formData.role} onValueChange={(v: 'admin' | 'team') => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">أخصائي تسويق</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'team' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">الأدوات المسموحة</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {ALL_TOOLS.map(tool => (
                      <div 
                        key={tool.id}
                        className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-border/50 bg-card/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleTool(tool.id)}
                      >
                        <span className="text-sm font-medium">{tool.name}</span>
                        <Switch
                          checked={formData.allowedTools.includes(tool.id)}
                          onCheckedChange={() => toggleTool(tool.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-3 sm:gap-3">
              <Button variant="outline" onClick={() => { setEditingUser(null); resetForm(); }} className="min-w-[100px]">إلغاء</Button>
              <Button
                onClick={handleUpdateUser}
                className="min-w-[140px]"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
