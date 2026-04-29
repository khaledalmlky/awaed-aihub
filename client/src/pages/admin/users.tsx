import { useMemo } from "react";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

type UserRole = "admin" | "member" | "team";
type UserStatus = "approved" | "pending" | "rejected" | "active" | "inactive";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();

  const pendingQuery = useQuery<{ users: AdminUser[]; count: number }>({
    queryKey: ["/api/admin/users/pending"],
  });

  const usersQuery = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const pendingUsers = pendingQuery.data?.users ?? [];
  const pendingCount = pendingQuery.data?.count ?? pendingUsers.length;
  const allUsers = usersQuery.data?.users ?? [];

  const members = useMemo(
    () => allUsers.filter((u) => u.status !== "pending"),
    [allUsers]
  );

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/approve`);
      return await res.json();
    },
    onSuccess: async () => {
      toast({ title: "تم", description: "تمت الموافقة على الطلب" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل اعتماد الطلب", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/reject`);
      return await res.json();
    },
    onSuccess: async () => {
      toast({ title: "تم", description: "تم رفض الطلب" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل رفض الطلب", variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "member" | "admin" }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
      return await res.json();
    },
    onSuccess: async () => {
      toast({ title: "تم", description: "تم تحديث الدور" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: async (err: any) => {
      const msg = typeof err?.message === "string" && err.message.includes("لا يمكنك تغيير دور حسابك الخاص")
        ? "لا يمكنك تغيير دور حسابك الخاص"
        : "فشل تحديث الدور";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return await res.json();
    },
    onSuccess: async () => {
      toast({ title: "تم", description: "تم حذف المستخدم" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل حذف المستخدم", variant: "destructive" });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1a2744] flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold">لوحة إدارة الأعضاء</h1>
              <p className="text-muted-foreground text-sm">الموافقة على الطلبات وإدارة الأعضاء</p>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-right">
                طلبات بانتظار الموافقة{" "}
                <Badge variant="secondary" className="mr-2">
                  {pendingCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الإيميل</TableHead>
                      <TableHead className="text-right">الجوال</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-right font-medium">{u.name}</TableCell>
                        <TableCell className="text-right">{u.email}</TableCell>
                        <TableCell className="text-right">{u.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-start">
                            <Button
                              size="sm"
                              className="rounded-lg"
                              style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "rgb(34,197,94)" }}
                              onClick={() => approveMutation.mutate(u.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-approve-${u.id}`}
                            >
                              <Check className="w-4 h-4 ml-1" />
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-lg"
                              style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "rgb(239,68,68)" }}
                              onClick={() => rejectMutation.mutate(u.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-reject-${u.id}`}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          لا توجد طلبات حالياً
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-right">الأعضاء الحاليين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الإيميل</TableHead>
                      <TableHead className="text-right">الجوال</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-right font-medium">{u.name}</TableCell>
                        <TableCell className="text-right">{u.email}</TableCell>
                        <TableCell className="text-right">{u.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={u.role === "team" ? "member" : (u.role as any)}
                            onValueChange={(v: "member" | "admin") => roleMutation.mutate({ id: u.id, role: v })}
                          >
                            <SelectTrigger className="w-[160px]" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">عضو</SelectItem>
                              <SelectItem value="admin">مدير</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
                              deleteMutation.mutate(u.id);
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          لا يوجد أعضاء بعد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}

