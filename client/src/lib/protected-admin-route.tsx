import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/" />;

  return <>{children}</>;
}

