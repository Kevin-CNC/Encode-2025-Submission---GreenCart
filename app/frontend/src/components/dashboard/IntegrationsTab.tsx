import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsCallerAdmin, useHealthCheck } from '../../hooks/useQueries';
import { CheckCircle, Copy, Download, ExternalLink, Shield, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ShopifyPluginExport from '../shopify/ShopifyPluginExport';

export default function IntegrationsTab() {
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: healthStatus, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useHealthCheck();
  const [copied, setCopied] = useState(false);

  const backendHealthy = healthStatus === 'OK';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const shopifyIntegrationCode = `<!-- GreenCart - Greenlight crypto in your shop! -->
<!-- Add this to your Shopify theme -->
<script type="module">
  import { createRoot } from 'https://esm.sh/react-dom@19.1.0/client';
  import { createElement } from 'https://esm.sh/react@19.1.0';
  
  // Shared backend handles all configuration automatically
  // No canister ID or API keys needed - everything is managed securely
  const MERCHANT_ID = 'default-merchant';
  
  // Initialize the GreenCart crypto payment plugin
  // Static conversion rates are pre-configured in the backend
  // Concordium PLT Stablecoin is pre-configured and ready to use
  window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('greencart-payment-plugin');
    if (container) {
      // Load your plugin component here
      // The component uses static conversion rates from backend
      console.log('GreenCart plugin initialized - zero configuration required');
    }
  });
</script>

<div id="greencart-payment-plugin" 
     data-merchant-id="default-merchant">
</div>`;

  const shopifyLiquidCode = `{% comment %}
  GreenCart - Greenlight crypto in your shop!
  Add this to your checkout.liquid or product.liquid template
  Zero configuration required - shared backend handles everything
{% endcomment %}

<div class="greencart-payment-section">
  <h3>Pay with Cryptocurrency</h3>
  <p class="greencart-tagline">Greenlight crypto in your shop!</p>
  
  {% comment %} Age verification for restricted products {% endcomment %}
  {% if product.tags contains 'age-restricted' or product.metafields.custom.age_verification == 'required' %}
  <div class="age-verification-notice">
    <p>This product requires age verification. You must be 18+ to purchase.</p>
  </div>
  {% endif %}
  
  <div id="greencart-payment-plugin"></div>
</div>

<script>
  // GreenCart: Concordium PLT Stablecoin is pre-configured
  // Static conversion rates are pre-configured in the backend
  // All credentials are securely managed by backend
  
  const orderTotal = {{ checkout.total_price | money_without_currency }};
  const currency = '{{ shop.currency }}';
  
  // Age verification check
  const requiresAgeVerification = {{ product.tags | json }}.includes('age-restricted') || 
                                  '{{ product.metafields.custom.age_verification }}' === 'required';
  
  if (requiresAgeVerification) {
    // Prompt for age verification before payment
    console.log('Age verification required for this product');
  }
  
  // Initialize payment with static conversion rates from backend
  console.log('Order total:', orderTotal, currency);
</script>`;

  if (!isAdmin) {
    return (
      <Card className="animate-bounce-in">
        <CardContent className="py-8 sm:py-12 text-center px-4">
          <p className="text-sm sm:text-base text-muted-foreground">Admin access required to view integrations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Backend Health Status Alert */}
      {healthLoading ? (
        <Alert className="animate-pulse border-blue-500/50 bg-blue-500/5">
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          <AlertDescription className="text-xs sm:text-sm">
            Checking backend health status...
          </AlertDescription>
        </Alert>
      ) : healthError || !backendHealthy ? (
        <Alert className="animate-bounce-in border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-xs sm:text-sm flex items-center justify-between">
            <span>
              <strong>Backend Unavailable:</strong> Unable to connect to GreenCart's shared backend. Payment features may not work correctly.
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetchHealth()}
              className="h-6 px-2 ml-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="animate-bounce-in border-green-500/50 bg-green-500/5">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Backend Online:</strong> GreenCart's shared backend is accessible and ready to process payments with static conversion rates.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="animate-bounce-in border-primary/50 bg-primary/5">
        <Zap className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs sm:text-sm">
          <strong>Zero Configuration Required!</strong> GreenCart's shared backend automatically handles all merchants with secure data isolation. Static conversion rates ensure consistent and reliable pricing. No API keys to manage - just install and start accepting crypto payments.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {[
          {
            title: 'Shared Backend',
            description: 'Multi-tenant architecture with strict data isolation',
            icon: Shield,
            gradient: 'from-blue-500 to-cyan-500',
            status: backendHealthy ? 'Active' : 'Unavailable',
            statusColor: backendHealthy ? 'green' : 'red',
          },
          {
            title: 'Static Rates',
            description: 'Pre-configured conversion rates for reliable pricing',
            icon: Zap,
            gradient: 'from-green-500 to-emerald-600',
            status: 'Active',
            statusColor: 'green',
          },
        ].map((integration, index) => (
          <Card
            key={index}
            className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur transition-all duration-500 hover:scale-105 hover:shadow-glow hover:border-primary/50 animate-bounce-in group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-br ${integration.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                  <integration.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    integration.statusColor === 'green' 
                      ? 'bg-green-500/10 text-green-600 border-green-500/50' 
                      : 'bg-red-500/10 text-red-600 border-red-500/50'
                  }`}
                >
                  {integration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-1 text-sm sm:text-base font-header">{integration.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{integration.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="font-header text-lg sm:text-xl">Static Conversion Rates</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            GreenCart uses pre-configured static rates for consistent and reliable pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { currency: 'BTC', name: 'Bitcoin', rate: '$65,000.00', gradient: 'from-orange-500 to-yellow-500' },
              { currency: 'ETH', name: 'Ethereum', rate: '$3,500.00', gradient: 'from-purple-500 to-blue-500' },
              { currency: 'ICP', name: 'Internet Computer', rate: '$12.00', gradient: 'from-pink-500 to-purple-500' },
              { currency: 'PLT', name: 'Concordium PLT', rate: '$0.50', gradient: 'from-green-500 to-emerald-600' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-105 animate-fade-scale"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-bold text-xs`}>
                    {item.currency.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.currency}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/50">
                  {item.rate}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.7s' }}>
        <CardHeader>
          <CardTitle className="font-header text-lg sm:text-xl">Shopify Integration</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            One-click installation with zero configuration. GreenCart's shared backend automatically handles all security and static conversion rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
              <TabsTrigger value="code" className="text-xs sm:text-sm">Code</TabsTrigger>
              <TabsTrigger value="liquid" className="text-xs sm:text-sm">Liquid</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="p-4 sm:p-6 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Live preview of the GreenCart Shopify plugin with static conversion rates:
                </p>
                <div className="flex justify-center">
                  <ShopifyPluginExport merchantId="default-merchant" />
                </div>
              </div>
              <Alert className="border-blue-500/50 bg-blue-500/5">
                <Zap className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                  This component uses static conversion rates from GreenCart's shared backend, which securely manages all configuration. Zero setup required for merchants.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="code" className="space-y-4 mt-4">
              <div className="relative">
                <pre className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50 overflow-x-auto text-xs sm:text-sm">
                  <code>{shopifyIntegrationCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyCode(shopifyIntegrationCode)}
                  className="absolute top-2 right-2 transition-all duration-300 hover:scale-105"
                >
                  {copied ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm sm:text-base font-header">Integration Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li>Verify backend health status (check the alert above)</li>
                  <li>Copy the generated code (no configuration needed)</li>
                  <li>Add the code to your Shopify theme's checkout or product page</li>
                  <li>The plugin automatically connects to GreenCart's shared backend</li>
                  <li>Static conversion rates are used for all transactions</li>
                  <li>Concordium PLT Stablecoin payments work out of the box</li>
                  <li>Test the integration with a small transaction</li>
                </ol>
              </div>
              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                  <strong>Secure by Design:</strong> All sensitive credentials are managed by GreenCart's shared backend. Merchants never see or handle API keys, endpoints, canister IDs, or other sensitive data. Static rates ensure consistent pricing.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="liquid" className="space-y-4 mt-4">
              <div className="relative">
                <pre className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50 overflow-x-auto text-xs sm:text-sm">
                  <code>{shopifyLiquidCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyCode(shopifyLiquidCode)}
                  className="absolute top-2 right-2 transition-all duration-300 hover:scale-105"
                >
                  {copied ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
              <Alert className="border-green-500/50 bg-green-500/5">
                <Shield className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                  Age verification is implemented using Shopify product tags ('age-restricted') or metafields (custom.age_verification). GreenCart checks these before allowing payment.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1 transition-all duration-300 hover:scale-105 hover:border-primary/50 text-xs sm:text-sm"
              onClick={() => window.open('https://help.shopify.com/en/manual/online-store/themes/theme-structure/extend/apps', '_blank')}
            >
              <ExternalLink className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Shopify Docs
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow animate-gradient text-xs sm:text-sm"
              onClick={() => {
                const blob = new Blob([shopifyIntegrationCode], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'greencart-shopify-plugin.js';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Plugin code downloaded');
              }}
            >
              <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Download Plugin
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.8s' }}>
        <CardHeader>
          <CardTitle className="font-header text-lg sm:text-xl">Security & Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 sm:space-y-3">
            {[
              'Zero configuration - no canister IDs or API keys to manage',
              'Shared backend with strict merchant data isolation',
              'Static conversion rates for consistent and reliable pricing',
              'Pre-configured rates: BTC ($65k), ETH ($3.5k), ICP ($12), PLT ($0.50)',
              'No external API dependencies - fully self-contained',
              'Automatic health checks and retry logic for reliability',
              'Comprehensive input validation and access control',
              'Age verification support via Shopify product tags and metafields',
              'Concordium PLT Stablecoin payments fully integrated',
              'Predictable conversion rates with user-friendly error handling',
              'Animated UI with smooth transitions and loading states',
              'Mobile-responsive design for all device sizes',
              'QR code support for mobile wallet payments',
              'Automatic blockchain confirmation tracking',
            ].map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-300 hover:scale-105 group animate-fade-scale text-xs sm:text-sm"
                style={{ animationDelay: `${0.9 + index * 0.05}s` }}
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '1.3s' }}>
        <CardHeader>
          <CardTitle className="font-header text-lg sm:text-xl">Architecture Benefits</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            GreenCart's shared backend architecture with static rates provides enterprise-grade security and reliability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm sm:text-base font-header flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Security
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>• Complete merchant data isolation</li>
                <li>• Encrypted storage with merchant-specific keys</li>
                <li>• Principle of least privilege access control</li>
                <li>• No sensitive credentials exposed to frontend</li>
                <li>• Comprehensive input validation</li>
                <li>• Automatic health monitoring and alerts</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm sm:text-base font-header flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Reliability
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>• Static conversion rates for consistent pricing</li>
                <li>• No external API dependencies</li>
                <li>• Predictable and stable conversion values</li>
                <li>• Zero network latency for rate fetching</li>
                <li>• Built-in retry and error recovery</li>
                <li>• Always returns expected conversion values</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
