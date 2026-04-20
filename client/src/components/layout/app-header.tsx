import { Link, useLocation } from 'wouter';
import { useAuth, getRoleLabel } from '@/lib/auth-context';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import AwaedLogo from '@/components/awaed-logo';
import ThemeToggle from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AppHeader() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openProfileDialog = () => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowProfileDialog(true);
  };

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: 'خطأ', description: 'كلمة المرور الجديدة غير متطابقة', variant: 'destructive' });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast({ title: 'خطأ', description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'تم', description: 'تم تحديث البيانات بنجاح' });
        setShowProfileDialog(false);
        refreshUser();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث البيانات', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20 relative">
          <div className="flex-1 flex justify-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                <Avatar className="w-10 h-10 border-2" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                  <AvatarFallback 
                    className="text-sm font-bold"
                    style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent)' }}
                  >
                    {user?.name?.charAt(0) || 'م'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-2 py-0"
                    style={{ borderColor: 'rgba(59,130,246,0.3)', color: 'var(--accent)' }}
                  >
                    {getRoleLabel(user?.role || 'team')}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={openProfileDialog} className="gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                تعديل البيانات الشخصية
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-red-500 focus:text-red-500">
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          <Link href="/" className="flex-shrink-0">
            <motion.div 
              className="cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AwaedLogo size="xl" animate={false} />
            </motion.div>
          </Link>

          <div className="flex-1 flex justify-end">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل البيانات الشخصية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-right block">الاسم</Label>
              <Input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-right block">البريد الإلكتروني</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-3 text-right">تغيير كلمة المرور (اختياري)</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-right block">كلمة المرور الحالية</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="اتركها فارغة إذا لم ترد التغيير"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-right block">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-right block">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full"
              style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
