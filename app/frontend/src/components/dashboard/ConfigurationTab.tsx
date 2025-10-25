import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetMerchantConfig, useInitializeMerchantConfig, useIsCallerAdmin, useInitializeDefaultMerchantConfig } from '../../hooks/useQueries';
import { Save, AlertCircle, Sparkles } from 'lucide-react';
import type { MerchantConfig } from '../../backend';

// Logging configuration - set to false for production
// LOGGING: Configuration changes are logged for merchant settings tracking
const ENABLE_LOGGING = true;

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  if (!ENABLE_LOGGING) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${level}] [${timestamp}] [CONFIG]`;
  console[level.toLowerCase() as 'info' | 'warn' | 'error'](prefix, message, data || '');
}

export default function ConfigurationTab() {
  const { data: isAdmin } = useIsCallerAdmin();
  const merchantId = 'default-merchant';
  const { data: existingConfig, isLoading } = useGetMerchantConfig(merchantId);
  const { mutate: saveConfig, isPending } = useInitializeMerchantConfig();
  const { mutate: initializeDefaultConfig, isPending: isInitializing } = useInitializeDefaultMerchantConfig();

  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['BTC', 'ETH', 'ICP']);
  const [preferredFiat, setPreferredFiat] = useState('USD');
  const [minConfirmations, setMinConfirmations] = useState('3');
  const [conversionSettings, setConversionSettings] = useState('HyperIndex');

  useEffect(() => {
    if (existingConfig) {
      log('INFO', 'Loading existing merchant configuration', {
        supportedCurrencies: existingConfig.supportedCurrencies,
        preferredFiat: existingConfig.preferredFiat,
        conversionSettings: existingConfig.conversionSettings,
      });
      setSupportedCurrencies(existingConfig.supportedCurrencies);
      setPreferredFiat(existingConfig.preferredFiat);
      setMinConfirmations(existingConfig.minConfirmations.toString());
      setConversionSettings(existingConfig.conversionSettings);
    }
  }, [existingConfig]);

  const handleCurrencyToggle = (currency: string) => {
    setSupportedCurrencies((prev) => {
      const newCurrencies = prev.includes(currency) 
        ? prev.filter((c) => c !== currency) 
        : [...prev, currency];
      log('INFO', 'Currency selection changed', { currency, selected: !prev.includes(currency), newCurrencies });
      return newCurrencies;
    });
  };

  const handleSave = () => {
    const config: MerchantConfig = {
      supportedCurrencies,
      preferredFiat,
      minConfirmations: BigInt(minConfirmations),
      conversionSettings,
    };

    log('INFO', 'Saving merchant configuration', {
      supportedCurrencies,
      preferredFiat,
      minConfirmations,
      conversionSettings,
    });

    saveConfig({ merchantId, config });
  };

  const handleInitializeDefault = () => {
    log('INFO', 'Initializing default merchant configuration');
    initializeDefaultConfig();
  };

  if (!isAdmin) {
    log('WARN', 'Non-admin user attempted to access configuration tab');
    return (
      <Card className="animate-bounce-in">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Admin access required to configure settings</p>
        </CardContent>
      </Card>
    );
  }

  const currencies = [
    { id: 'btc', code: 'BTC', name: 'Bitcoin', symbol: '₿', gradient: 'from-orange-500 to-yellow-500', description: 'The original cryptocurrency' },
    { id: 'eth', code: 'ETH', name: 'Ethereum', symbol: 'Ξ', gradient: 'from-purple-500 to-blue-500', description: 'Smart contract platform' },
    { id: 'icp', code: 'ICP', name: 'Internet Computer', symbol: '∞', gradient: 'from-pink-500 to-purple-500', description: 'Decentralized cloud computing' },
    { id: 'plt', code: 'PLT', name: 'Concordium PLT Stablecoin', symbol: 'P', gradient: 'from-green-500 to-emerald-600', description: 'Privacy-preserving stablecoin' },
  ];

  const showConfigPrompt = !isLoading && existingConfig === null;

  log('INFO', 'Rendering configuration tab', { isAdmin, isLoading, hasConfig: !!existingConfig });

  return (
    <div className="space-y-6">
      {showConfigPrompt && (
        <Alert className="animate-bounce-in border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex-1">
              Merchant configuration not found. Initialize your default configuration to get started.
            </span>
            <Button
              onClick={handleInitializeDefault}
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

      <Alert className="animate-bounce-in border-primary/50 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription>
          Configure your crypto payment settings with HyperIndex for real-time conversion rates via proxy. Changes will apply to all new transactions.
        </AlertDescription>
      </Alert>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="font-header">Supported Cryptocurrencies</CardTitle>
          <CardDescription>Select which cryptocurrencies you want to accept with live HyperIndex rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {currencies.map((currency, index) => (
              <div
                key={currency.id}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-glow group animate-fade-scale"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <Checkbox
                  id={currency.id}
                  checked={supportedCurrencies.includes(currency.code)}
                  onCheckedChange={() => handleCurrencyToggle(currency.code)}
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${currency.gradient} flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                    {currency.symbol}
                  </div>
                  <div>
                    <Label htmlFor={currency.id} className="font-semibold cursor-pointer">
                      {currency.name} ({currency.code})
                    </Label>
                    <p className="text-xs text-muted-foreground">{currency.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
          <CardTitle className="font-header">Conversion Settings</CardTitle>
          <CardDescription>Configure how crypto payments are converted to fiat using HyperIndex proxy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 animate-fade-scale" style={{ animationDelay: '0.7s' }}>
              <Label htmlFor="fiat">Preferred Fiat Currency</Label>
              <Select value={preferredFiat} onValueChange={(value) => {
                log('INFO', 'Preferred fiat currency changed', { from: preferredFiat, to: value });
                setPreferredFiat(value);
              }}>
                <SelectTrigger id="fiat" className="transition-all duration-300 hover:border-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 animate-fade-scale" style={{ animationDelay: '0.8s' }}>
              <Label htmlFor="confirmations">Minimum Confirmations</Label>
              <Input
                id="confirmations"
                type="number"
                min="1"
                max="10"
                value={minConfirmations}
                onChange={(e) => {
                  log('INFO', 'Minimum confirmations changed', { from: minConfirmations, to: e.target.value });
                  setMinConfirmations(e.target.value);
                }}
                className="transition-all duration-300 hover:border-primary/50 focus:shadow-glow"
              />
              <p className="text-xs text-muted-foreground">
                Number of blockchain confirmations required before marking payment as complete
              </p>
            </div>
          </div>

          <div className="space-y-2 animate-fade-scale" style={{ animationDelay: '0.9s' }}>
            <Label htmlFor="conversion">Conversion Mode</Label>
            <Select value={conversionSettings} onValueChange={(value) => {
              log('INFO', 'Conversion mode changed', { from: conversionSettings, to: value });
              setConversionSettings(value);
            }}>
              <SelectTrigger id="conversion" className="transition-all duration-300 hover:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HyperIndex">HyperIndex - Real-time conversion via proxy</SelectItem>
                <SelectItem value="Manual">Manual - Hold crypto and convert manually</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              HyperIndex provides instant, accurate conversion rates via proxy for all supported cryptocurrencies
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end animate-bounce-in" style={{ animationDelay: '1s' }}>
        <Button
          onClick={handleSave}
          disabled={isPending || supportedCurrencies.length === 0}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow animate-gradient"
        >
          {isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
