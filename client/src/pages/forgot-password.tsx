import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <h1 className="text-2xl font-bold">استعادة كلمة المرور</h1>
          <p className="text-muted-foreground">
            يرجى التواصل مع المسؤول لإعادة تعيين كلمة المرور.
          </p>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة لتسجيل الدخول
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
