import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/pages/landing";
import SignUpPage from "@/pages/signup";
import LoginPage from "@/pages/login";
import UserSignupPage from "@/pages/user-signup";
import UserLoginPage from "@/pages/user-login";
import UserDashboardPage from "@/pages/user-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/user-signup" component={UserSignupPage} />
      <Route path="/user-login" component={UserLoginPage} />
      <Route path="/user-dashboard" component={UserDashboardPage} />
      <Route path="/home" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/createevent" component={Home} />
      <Route path="/generateticket" component={Home} />
      <Route path="/verifyevent" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
