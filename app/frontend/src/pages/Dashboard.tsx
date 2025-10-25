import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Settings, History, Plug, AlertCircle, Sparkles } from 'lucide-react';
import { useGetMerchantConfig, useInitializeDefaultMerchantConfig } from '../hooks/useQueries';

// Lazy load dashboard tabs for code splitting
const OverviewTab = lazy(() => import('../components/dashboard/OverviewTab'));
const ConfigurationTab = lazy(() => import('../components/dashboard/ConfigurationTab'));
const TransactionsTab = lazy(() => import('../components/dashboard/TransactionsTab'));
const IntegrationsTab = lazy(() => import('../components/dashboard/IntegrationsTab'));

function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const merchantId = 'default-merchant';
  const { data: merchantConfig, isLoading: configLoading } = useGetMerchantConfig(merchantId);
  const { mutate: initializeConfig, isPending: isInitializing } = useInitializeDefaultMerchantConfig();

  const tabs = [
    { value: 'overview', icon: LayoutDashboard, label: 'Overview', shortLabel: 'Overview' },
    { value: 'configuration', icon: Settings, label: 'Config', shortLabel: 'Config' },
    { value: 'transactions', icon: History, label: 'Transactions', shortLabel: 'Txns' },
    { value: 'integrations', icon: Plug, label: 'Shopify', shortLabel: 'Shop' },
  ];

  const handleInitializeConfig = () => {
    initializeConfig();
  };

  const showConfigPrompt = !configLoading && merchantConfig === null;

  return (
    <div className="container py-4 sm:py-6 md:py-8 px-4 sm:px-6 animate-fade-in">
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-header animate-gradient">
          Merchant Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your crypto payment settings with real-time Envio HyperSync conversion rates
        </p>
      </div>

      {showConfigPrompt && (
        <Alert className="mb-6 border-primary/50 bg-primary/5 animate-bounce-in">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex-1">
              Merchant configuration not found. Initialize your default configuration to get started with crypto payments.
            </span>
            <Button
              onClick={handleInitializeConfig}
              disabled={isInitializing}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow shrink-0"
              size="sm"
            >
              {isInitializing ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3 w-3" />
                  Initialize Config
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-full sm:max-w-2xl bg-card/50 backdrop-blur h-auto p-1" role="tablist" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1 sm:gap-2 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow text-xs sm:text-sm py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={tab.label}
            >
              <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-scale" role="tabpanel" aria-labelledby="overview-tab">
          <Suspense fallback={<TabLoadingFallback />}>
            <OverviewTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4 sm:space-y-6 animate-fade-scale" role="tabpanel" aria-labelledby="configuration-tab">
          <Suspense fallback={<TabLoadingFallback />}>
            <ConfigurationTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 sm:space-y-6 animate-fade-scale" role="tabpanel" aria-labelledby="transactions-tab">
          <Suspense fallback={<TabLoadingFallback />}>
            <TransactionsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 sm:space-y-6 animate-fade-scale" role="tabpanel" aria-labelledby="integrations-tab">
          <Suspense fallback={<TabLoadingFallback />}>
            <IntegrationsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
