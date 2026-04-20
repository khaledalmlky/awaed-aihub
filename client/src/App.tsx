import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import BusinessAnalyzer from "@/pages/business-analyzer";
import CampaignBrain from "@/pages/campaign-brain";
import ContentStudio from "@/pages/content-studio";
import SmartAnalyzer from "@/pages/smart-analyzer";
import CampaignPlanner from "@/pages/campaign-planner";
import PerformanceAnalyzer from "@/pages/performance-analyzer";
import AdminUsers from "@/pages/admin-users";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/business-analyzer" component={BusinessAnalyzer} />
      <Route path="/campaign-brain" component={CampaignBrain} />
      <Route path="/content-studio" component={ContentStudio} />
      <Route path="/smart-analyzer" component={SmartAnalyzer} />
      <Route path="/campaign-planner" component={CampaignPlanner} />
      <Route path="/performance-analyzer" component={PerformanceAnalyzer} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <ScrollToTop />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
