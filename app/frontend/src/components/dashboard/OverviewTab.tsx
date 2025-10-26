import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetMerchantTransactions, useIsCallerAdmin, useGetTotalConfirmedValue, useGetTotalPendingValue, useFetchDynamicPrices, useProxyHealthCheck, useGetMerchantConfig } from '../../hooks/useQueries';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, Shield, Zap, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function OverviewTab() {
  const { data: isAdmin } = useIsCallerAdmin();
  const merchantId = 'default-merchant';
  const { data: transactions, isLoading } = useGetMerchantTransactions(merchantId);
  const { data: totalConfirmedValue, isLoading: loadingConfirmedValue, error: confirmedValueError } = useGetTotalConfirmedValue(merchantId);
  const { data: totalPendingValue, isLoading: loadingPendingValue, error: pendingValueError } = useGetTotalPendingValue(merchantId);
  const { data: merchantConfig } = useGetMerchantConfig(merchantId);
  const { data: proxyHealthy } = useProxyHealthCheck();
  
  // Fetch dynamic prices if conversion mode is Dynamic
  const useDynamicRates = merchantConfig?.conversionSettings === 'Dynamic';
  const { data: dynamicPrices, isLoading: loadingDynamicPrices, error: dynamicPricesError, refetch: refetchPrices } = useFetchDynamicPrices(
    ['BTC', 'ETH', 'ICP', 'PLT'],
    'USD',
    useDynamicRates && !!proxyHealthy
  );

  if (!isAdmin) {
    return (
      <Card className="animate-bounce-in">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Admin access required to view dashboard</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalTransactions = transactions?.length || 0;
  const confirmedTransactions = transactions?.filter((t) => t.status === 'confirmed').length || 0;
  const pendingTransactions = transactions?.filter((t) => t.status === 'pending').length || 0;
  
  const confirmedAmount = totalConfirmedValue ? Number(totalConfirmedValue) : 0;
  const pendingAmount = totalPendingValue ? Number(totalPendingValue) : 0;

  const stats = [
    {
      title: 'Total Transactions',
      value: totalTransactions,
      subtitle: 'All time',
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Confirmed Volume',
      value: loadingConfirmedValue ? 'Loading...' : confirmedValueError ? 'Error' : `$${(confirmedAmount / 100).toFixed(2)}`,
      subtitle: 'USD equivalent via static rates (confirmed only)',
      icon: DollarSign,
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      title: 'Pending Volume',
      value: loadingPendingValue ? 'Loading...' : pendingValueError ? 'Error' : `$${(pendingAmount / 100).toFixed(2)}`,
      subtitle: `${pendingTransactions} transactions awaiting confirmation`,
      icon: Clock,
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Confirmed',
      value: confirmedTransactions,
      subtitle: 'Successfully processed',
      icon: CheckCircle,
      gradient: 'from-lime-500 to-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      {(confirmedValueError || pendingValueError) && (
        <Alert className="border-destructive/50 bg-destructive/5 animate-bounce-in">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Unable to calculate conversion values. Please check backend configuration.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur transition-all duration-500 hover:scale-105 hover:shadow-glow hover:border-primary/50 animate-bounce-in group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-header bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="font-header">Quick Start Guide</CardTitle>
          <CardDescription>Get your crypto payment system up and running with zero configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Configure Your Settings',
                description: 'Go to the Configuration tab to set up supported cryptocurrencies and preferred fiat currency. Static conversion rates are pre-configured for reliable pricing.',
              },
              {
                step: 2,
                title: 'Test a Payment',
                description: 'Create a test transaction to ensure everything is working correctly with static conversion rates before going live.',
              },
              {
                step: 3,
                title: 'Monitor Transactions',
                description: 'Use the Transactions tab to track all payments with static conversion data, view status updates, and export data for accounting.',
              },
              {
                step: 4,
                title: 'Integrate with Shopify',
                description: 'One-click installation with the ready-to-use React component. No canister IDs or API keys needed - the shared backend handles everything.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-fade-scale group"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold transition-all duration-300 group-hover:scale-125 group-hover:rotate-12">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold mb-1 font-header">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.9s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-header">Cryptocurrency Rates</CardTitle>
              <CardDescription className="text-xs mt-1">
                {useDynamicRates ? 'Real-time rates via HyperIndex' : 'Static pre-configured rates'}
              </CardDescription>
            </div>
            {useDynamicRates && proxyHealthy && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/50">
                <RefreshCw className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {useDynamicRates && dynamicPricesError && (
              <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/5">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs">
                  Unable to fetch dynamic rates. Displaying static rates as fallback.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              {[
                { 
                  symbol: '₿', 
                  name: 'Bitcoin', 
                  code: 'BTC', 
                  staticRate: '$65,000', 
                  gradient: 'from-orange-500 to-yellow-500' 
                },
                { 
                  symbol: 'Ξ', 
                  name: 'Ethereum', 
                  code: 'ETH', 
                  staticRate: '$3,500', 
                  gradient: 'from-purple-500 to-blue-500' 
                },
                { 
                  symbol: '∞', 
                  name: 'Internet Computer', 
                  code: 'ICP', 
                  staticRate: '$12', 
                  gradient: 'from-pink-500 to-purple-500' 
                },
                { 
                  symbol: 'P', 
                  name: 'Concordium PLT', 
                  code: 'PLT Stablecoin', 
                  staticRate: '$0.50', 
                  gradient: 'from-green-500 to-emerald-600' 
                },
              ].map((crypto, index) => {
                const dynamicPrice = dynamicPrices?.prices?.[crypto.code === 'PLT Stablecoin' ? 'PLT' : crypto.code];
                const displayRate = useDynamicRates && dynamicPrice 
                  ? dynamicPrice.formatted 
                  : crypto.staticRate;
                const rateLabel = useDynamicRates && dynamicPrice 
                  ? `Live (${dynamicPrices.source})`
                  : 'Static rate';
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-105 hover:shadow-glow group animate-fade-scale"
                    style={{ animationDelay: `${1 + index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${crypto.gradient} flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                        {crypto.symbol}
                      </div>
                      <div>
                        <p className="font-semibold">{crypto.name}</p>
                        <p className="text-xs text-muted-foreground">{crypto.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {loadingDynamicPrices && useDynamicRates ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-primary">{displayRate}</p>
                          <p className="text-xs text-muted-foreground">{rateLabel}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {useDynamicRates && dynamicPrices && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Last updated: {new Date(dynamicPrices.timestamp).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '1s' }}>
          <CardHeader>
            <CardTitle className="font-header">Payment Features</CardTitle>
            <CardDescription>Condensed overview of key capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { icon: CheckCircle, text: 'Multi-crypto support (BTC, ETH, ICP, PLT)' },
                { icon: Zap, text: 'Static conversion rates for reliable pricing' },
                { icon: CheckCircle, text: 'Instant payment confirmation' },
                { icon: Shield, text: 'Secure wallet integration with QR codes' },
                { icon: CheckCircle, text: 'Test mode for safe plugin evaluation' },
              ].map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-300 hover:scale-105 group animate-fade-scale"
                  style={{ animationDelay: `${1.1 + index * 0.05}s` }}
                >
                  <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                  <span className="text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '1.4s' }}>
        <CardHeader>
          <CardTitle className="font-header">Security & Features</CardTitle>
          <CardDescription>Enterprise-grade security with zero configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            {[
              { icon: Shield, text: 'Bank-level encryption for all payment data' },
              { icon: CheckCircle, text: 'Privacy-preserving identity verification' },
              { icon: Shield, text: 'Fraud detection and rate limiting' },
              { icon: Zap, text: 'Complete Shopify integration with zero setup' },
              { icon: CheckCircle, text: 'Responsive design for all devices' },
              { icon: Shield, text: 'Strict merchant data isolation' },
            ].map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-300 hover:scale-105 group animate-fade-scale"
                style={{ animationDelay: `${1.5 + index * 0.05}s` }}
              >
                <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                <span className="text-sm">{feature.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
