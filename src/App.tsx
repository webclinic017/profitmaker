import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieNotification } from "@/components/ui/cookie-notification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BottomLeftInfo from './components/BottomLeftInfo';
import RightClickInfo from './components/RightClickInfo';
import TestProviderIntegration from './components/TestProviderIntegration';
import { TestChartWidget } from './components/TestChartWidget';
import WidgetSettingsManager from './components/WidgetSettingsManager';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test-providers" element={<TestProviderIntegration />} />
            <Route path="/test-chart" element={<TestChartWidget />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <BottomLeftInfo />
        <RightClickInfo />
        <CookieNotification />
        <WidgetSettingsManager />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
