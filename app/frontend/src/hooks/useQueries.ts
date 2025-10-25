import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, MerchantConfig, PaymentTransaction, ExchangeRate, ConcordiumConfig, EnvioConfig } from '../backend';
import { toast } from 'sonner';

// Logging configuration - set to false for production
const ENABLE_LOGGING = true;

// Logging utility function with log levels
// LOGGING: All frontend operations are logged to browser console for development visibility
function log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', category: string, message: string, data?: any) {
  if (!ENABLE_LOGGING) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${level}] [${timestamp}] [${category}]`;
  
  // Never log sensitive information
  const sanitizedData = data ? sanitizeLogData(data) : undefined;
  
  switch (level) {
    case 'DEBUG':
      console.debug(prefix, message, sanitizedData);
      break;
    case 'INFO':
      console.info(prefix, message, sanitizedData);
      break;
    case 'WARN':
      console.warn(prefix, message, sanitizedData);
      break;
    case 'ERROR':
      console.error(prefix, message, sanitizedData);
      break;
  }
}

// Sanitize data to remove sensitive information before logging
// LOGGING: Ensures API keys, credentials, and personal data are never logged
function sanitizeLogData(data: any): any {
  if (!data) return data;
  
  const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'credential', 'privateKey'];
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeLogData(sanitized[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching caller user profile');
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getCallerUserProfile');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getCallerUserProfile();
        log('INFO', 'API', 'Successfully fetched caller user profile', { hasProfile: !!result });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch caller user profile', { error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      log('INFO', 'API', 'Saving caller user profile', { profileName: profile.name });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for saveCallerUserProfile');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.saveCallerUserProfile(profile);
        log('INFO', 'API', 'Successfully saved caller user profile');
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to save caller user profile', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating currentUserProfile query cache');
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Profile save mutation failed', { error: error.message });
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      log('INFO', 'API', 'Checking if caller is admin');
      if (!actor) {
        log('WARN', 'API', 'Actor not available for isCallerAdmin, returning false');
        return false;
      }
      
      try {
        const result = await actor.isCallerAdmin();
        log('INFO', 'API', 'Successfully checked admin status', { isAdmin: result });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to check admin status', { error: error.message });
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Health check hook to verify backend accessibility
// LOGGING: Health check operations are logged for monitoring backend connectivity
export function useHealthCheck() {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['healthCheck'],
    queryFn: async () => {
      log('INFO', 'HEALTH', 'Performing backend health check');
      if (!actor) {
        log('ERROR', 'HEALTH', 'Backend not available for health check');
        throw new Error('Backend not available');
      }
      
      try {
        const result = await actor.healthCheck();
        log('INFO', 'HEALTH', 'Backend health check successful', { status: result });
        return result;
      } catch (error: any) {
        log('ERROR', 'HEALTH', 'Backend health check failed', { error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 3,
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 10000);
      log('WARN', 'HEALTH', `Retrying health check (attempt ${attemptIndex + 1})`, { delay });
      return delay;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGetMerchantConfig(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MerchantConfig | null>({
    queryKey: ['merchantConfig', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching merchant config', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getMerchantConfig');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getMerchantConfig(merchantId);
        log('INFO', 'API', 'Successfully fetched merchant config', { 
          merchantId, 
          supportedCurrencies: result.supportedCurrencies,
          conversionSettings: result.conversionSettings 
        });
        return result;
      } catch (error: any) {
        // Check if error is "Merchant config not found"
        if (error.message?.includes('Merchant config not found')) {
          log('WARN', 'API', 'Merchant config not found, returning null', { merchantId });
          return null;
        }
        log('ERROR', 'API', 'Failed to fetch merchant config', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
    retry: false,
  });
}

export function useInitializeMerchantConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, config }: { merchantId: string; config: MerchantConfig }) => {
      log('INFO', 'CONFIG', 'Initializing merchant config', { 
        merchantId, 
        supportedCurrencies: config.supportedCurrencies,
        conversionSettings: config.conversionSettings 
      });
      if (!actor) {
        log('ERROR', 'CONFIG', 'Actor not available for initializeMerchantConfig');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.initializeMerchantConfig(merchantId, config);
        log('INFO', 'CONFIG', 'Successfully initialized merchant config', { merchantId });
      } catch (error: any) {
        log('ERROR', 'CONFIG', 'Failed to initialize merchant config', { merchantId, error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating merchantConfig query cache');
      queryClient.invalidateQueries({ queryKey: ['merchantConfig'] });
      toast.success('Merchant configuration saved');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Merchant config mutation failed', { error: error.message });
      toast.error(`Failed to save configuration: ${error.message}`);
    },
  });
}

// Initialize default merchant config
export function useInitializeDefaultMerchantConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      log('INFO', 'CONFIG', 'Initializing default merchant config');
      if (!actor) {
        log('ERROR', 'CONFIG', 'Actor not available for initializeDefaultMerchantConfig');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.initializeDefaultMerchantConfig();
        log('INFO', 'CONFIG', 'Successfully initialized default merchant config');
      } catch (error: any) {
        log('ERROR', 'CONFIG', 'Failed to initialize default merchant config', { error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating merchantConfig query cache after default initialization');
      queryClient.invalidateQueries({ queryKey: ['merchantConfig'] });
      toast.success('Default merchant configuration initialized');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Default merchant config initialization failed', { error: error.message });
      toast.error(`Failed to initialize default configuration: ${error.message}`);
    },
  });
}

export function useGetMerchantTransactions(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentTransaction[]>({
    queryKey: ['merchantTransactions', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching merchant transactions', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getMerchantTransactions');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getMerchantTransactions(merchantId);
        log('INFO', 'API', 'Successfully fetched merchant transactions', { 
          merchantId, 
          transactionCount: result.length 
        });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch merchant transactions', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
  });
}

export function useCreatePaymentTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: PaymentTransaction) => {
      log('INFO', 'PAYMENT', 'Creating payment transaction', { 
        transactionId: transaction.id,
        merchantId: transaction.merchantId,
        currency: transaction.currency,
        status: transaction.status 
      });
      if (!actor) {
        log('ERROR', 'PAYMENT', 'Actor not available for createPaymentTransaction');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.createPaymentTransaction(transaction);
        log('INFO', 'PAYMENT', 'Successfully created payment transaction', { transactionId: transaction.id });
      } catch (error: any) {
        log('ERROR', 'PAYMENT', 'Failed to create payment transaction', { 
          transactionId: transaction.id, 
          error: error.message 
        });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating transaction-related query caches');
      queryClient.invalidateQueries({ queryKey: ['merchantTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['totalConfirmedValue'] });
      queryClient.invalidateQueries({ queryKey: ['totalPendingValue'] });
      toast.success('Payment transaction created');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Payment transaction creation failed', { error: error.message });
      toast.error(`Failed to create transaction: ${error.message}`);
    },
  });
}

export function useUpdatePaymentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string; status: string }) => {
      log('INFO', 'PAYMENT', 'Updating payment status', { transactionId, status });
      if (!actor) {
        log('ERROR', 'PAYMENT', 'Actor not available for updatePaymentStatus');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.updatePaymentStatus(transactionId, status);
        log('INFO', 'PAYMENT', 'Successfully updated payment status', { transactionId, status });
      } catch (error: any) {
        log('ERROR', 'PAYMENT', 'Failed to update payment status', { 
          transactionId, 
          status, 
          error: error.message 
        });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating transaction-related query caches');
      queryClient.invalidateQueries({ queryKey: ['merchantTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['totalConfirmedValue'] });
      queryClient.invalidateQueries({ queryKey: ['totalPendingValue'] });
      toast.success('Payment status updated');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Payment status update failed', { error: error.message });
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

export function useFetchExchangeRates() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      log('INFO', 'RATE', 'Fetching exchange rates from Envio HyperIndex proxy');
      if (!actor) {
        log('ERROR', 'RATE', 'Actor not available for fetchExchangeRates');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.fetchExchangeRates();
        log('INFO', 'RATE', 'Successfully fetched exchange rates', { responseLength: result.length });
        return result;
      } catch (error: any) {
        log('ERROR', 'RATE', 'Failed to fetch exchange rates', { error: error.message });
        throw error;
      }
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Exchange rates fetch mutation failed', { error: error.message });
      toast.error(`Failed to fetch exchange rates: ${error.message}`);
    },
  });
}

export function useStoreExchangeRate() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (rate: ExchangeRate) => {
      log('INFO', 'RATE', 'Storing exchange rate', { currency: rate.currency, rate: rate.rate.toString() });
      if (!actor) {
        log('ERROR', 'RATE', 'Actor not available for storeExchangeRate');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.storeExchangeRate(rate);
        log('INFO', 'RATE', 'Successfully stored exchange rate', { currency: rate.currency });
      } catch (error: any) {
        log('ERROR', 'RATE', 'Failed to store exchange rate', { currency: rate.currency, error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Exchange rate stored');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Exchange rate storage failed', { error: error.message });
      toast.error(`Failed to store exchange rate: ${error.message}`);
    },
  });
}

// Get total confirmed transaction value (excludes pending)
// LOGGING: Volume calculations are logged for financial tracking visibility
export function useGetTotalConfirmedValue(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['totalConfirmedValue', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching total confirmed value', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getTotalConfirmedValue');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getTotalConfirmedValue(merchantId);
        log('INFO', 'API', 'Successfully fetched total confirmed value', { 
          merchantId, 
          value: result.toString() 
        });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch total confirmed value', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
  });
}

// Get total pending transaction value
// LOGGING: Pending volume calculations are logged for transaction monitoring
export function useGetTotalPendingValue(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['totalPendingValue', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching total pending value', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getTotalPendingValue');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getTotalPendingValue(merchantId);
        log('INFO', 'API', 'Successfully fetched total pending value', { 
          merchantId, 
          value: result.toString() 
        });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch total pending value', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
  });
}

// Get live conversion rate from Envio HyperIndex proxy (backend handles proxy URL)
// LOGGING: Conversion rate fetches are logged with retry attempts for debugging rate availability
export function useGetLiveConversionRate(currency: string, enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['liveConversionRate', currency],
    queryFn: async () => {
      log('INFO', 'RATE', 'Fetching live conversion rate from Envio HyperIndex proxy', { currency });
      if (!actor) {
        log('ERROR', 'RATE', 'Actor not available for getLiveConversionRate');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getLiveConversionRate(currency);
        log('INFO', 'RATE', 'Successfully fetched live conversion rate', { 
          currency, 
          rate: result.toString() 
        });
        return result;
      } catch (error: any) {
        if (error.message?.includes('Conversion unavailable')) {
          log('WARN', 'RATE', 'Conversion unavailable from Envio HyperIndex proxy', { currency });
          throw new Error('Conversion unavailable, please try again later');
        }
        log('ERROR', 'RATE', 'Failed to fetch live conversion rate', { currency, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!currency && enabled,
    retry: 3,
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 5000);
      log('WARN', 'RATE', `Retrying conversion rate fetch (attempt ${attemptIndex + 1})`, { currency, delay });
      return delay;
    },
    staleTime: 10000,
  });
}

// Convert amount using live rate from Envio HyperIndex proxy (backend handles proxy URL)
// LOGGING: Amount conversions are logged for transaction processing visibility
export function useConvertAmount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ amount, currency }: { amount: bigint; currency: string }) => {
      log('INFO', 'RATE', 'Converting amount via Envio HyperIndex proxy', { amount: amount.toString(), currency });
      if (!actor) {
        log('ERROR', 'RATE', 'Actor not available for convertAmount');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.convertAmount(amount, currency);
        log('INFO', 'RATE', 'Successfully converted amount', { 
          amount: amount.toString(), 
          currency, 
          convertedAmount: result.toString() 
        });
        return result;
      } catch (error: any) {
        if (error.message?.includes('Conversion unavailable')) {
          log('WARN', 'RATE', 'Conversion unavailable from Envio HyperIndex proxy', { amount: amount.toString(), currency });
          throw new Error('Conversion unavailable, please try again later');
        }
        log('ERROR', 'RATE', 'Failed to convert amount', { 
          amount: amount.toString(), 
          currency, 
          error: error.message 
        });
        throw error;
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('Conversion unavailable')) {
        log('WARN', 'STATE', 'Amount conversion unavailable');
        toast.error('Conversion unavailable, please try again later');
      } else {
        log('ERROR', 'STATE', 'Amount conversion failed', { error: error.message });
        toast.error(`Failed to convert amount: ${error.message}`);
      }
    },
  });
}

// Concordium integration hooks
// LOGGING: Concordium operations are logged for privacy-preserving payment tracking
export function useGetConcordiumConfig(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ConcordiumConfig>({
    queryKey: ['concordiumConfig', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching Concordium config', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getConcordiumConfig');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getConcordiumConfig(merchantId);
        log('INFO', 'API', 'Successfully fetched Concordium config', { merchantId, network: result.network });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch Concordium config', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
  });
}

export function useInitializeConcordiumConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, config }: { merchantId: string; config: ConcordiumConfig }) => {
      log('INFO', 'CONFIG', 'Initializing Concordium config', { merchantId, network: config.network });
      if (!actor) {
        log('ERROR', 'CONFIG', 'Actor not available for initializeConcordiumConfig');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.initializeConcordiumConfig(merchantId, config);
        log('INFO', 'CONFIG', 'Successfully initialized Concordium config', { merchantId });
      } catch (error: any) {
        log('ERROR', 'CONFIG', 'Failed to initialize Concordium config', { merchantId, error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating concordiumConfig query cache');
      queryClient.invalidateQueries({ queryKey: ['concordiumConfig'] });
      toast.success('Concordium configuration saved');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Concordium config mutation failed', { error: error.message });
      toast.error(`Failed to save Concordium configuration: ${error.message}`);
    },
  });
}

export function useProcessConcordiumPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, amount, currency }: { merchantId: string; amount: bigint; currency: string }) => {
      log('INFO', 'PAYMENT', 'Processing Concordium payment', { 
        merchantId, 
        amount: amount.toString(), 
        currency 
      });
      if (!actor) {
        log('ERROR', 'PAYMENT', 'Actor not available for processConcordiumPayment');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.processConcordiumPayment(merchantId, amount, currency);
        log('INFO', 'PAYMENT', 'Successfully processed Concordium payment', { merchantId, result });
        return result;
      } catch (error: any) {
        log('ERROR', 'PAYMENT', 'Failed to process Concordium payment', { 
          merchantId, 
          amount: amount.toString(), 
          currency, 
          error: error.message 
        });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating merchantTransactions query cache');
      queryClient.invalidateQueries({ queryKey: ['merchantTransactions'] });
      toast.success('Concordium payment processing initiated');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Concordium payment processing failed', { error: error.message });
      toast.error(`Failed to process Concordium payment: ${error.message}`);
    },
  });
}

// Envio HyperIndex proxy integration hooks (backend handles proxy URL)
// LOGGING: Envio HyperIndex operations are logged for blockchain data tracking
export function useGetEnvioConfig(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<EnvioConfig>({
    queryKey: ['envioConfig', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching Envio config', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getEnvioConfig');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getEnvioConfig(merchantId);
        log('INFO', 'API', 'Successfully fetched Envio config', { merchantId, endpoint: result.endpoint });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch Envio config', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
  });
}

export function useInitializeEnvioConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, config }: { merchantId: string; config: EnvioConfig }) => {
      log('INFO', 'CONFIG', 'Initializing Envio config', { merchantId, endpoint: config.endpoint });
      if (!actor) {
        log('ERROR', 'CONFIG', 'Actor not available for initializeEnvioConfig');
        throw new Error('Actor not available');
      }
      
      try {
        await actor.initializeEnvioConfig(merchantId, config);
        log('INFO', 'CONFIG', 'Successfully initialized Envio config', { merchantId });
      } catch (error: any) {
        log('ERROR', 'CONFIG', 'Failed to initialize Envio config', { merchantId, error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      log('INFO', 'STATE', 'Invalidating envioConfig query cache');
      queryClient.invalidateQueries({ queryKey: ['envioConfig'] });
      toast.success('Envio HyperIndex configuration saved');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Envio config mutation failed', { error: error.message });
      toast.error(`Failed to save Envio configuration: ${error.message}`);
    },
  });
}

export function useFetchBlockchainHistory() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ merchantId, currency }: { merchantId: string; currency: string }) => {
      log('INFO', 'API', 'Fetching blockchain history via Envio HyperIndex proxy', { merchantId, currency });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for fetchBlockchainHistory');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.fetchBlockchainHistory(merchantId, currency);
        log('INFO', 'API', 'Successfully fetched blockchain history', { merchantId, currency, resultLength: result.length });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch blockchain history', { merchantId, currency, error: error.message });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Blockchain history fetched via Envio HyperIndex');
    },
    onError: (error: Error) => {
      log('ERROR', 'STATE', 'Blockchain history fetch failed', { error: error.message });
      toast.error(`Failed to fetch blockchain history: ${error.message}`);
    },
  });
}

// Shopify plugin export hook with health check integration
// LOGGING: Shopify plugin operations are logged for integration monitoring
export function useGetShopifyPluginConfig(merchantId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MerchantConfig>({
    queryKey: ['shopifyPluginConfig', merchantId],
    queryFn: async () => {
      log('INFO', 'API', 'Fetching Shopify plugin config', { merchantId });
      if (!actor) {
        log('ERROR', 'API', 'Actor not available for getShopifyPluginConfig');
        throw new Error('Actor not available');
      }
      
      try {
        const result = await actor.getShopifyPluginConfig(merchantId);
        log('INFO', 'API', 'Successfully fetched Shopify plugin config', { 
          merchantId, 
          supportedCurrencies: result.supportedCurrencies 
        });
        return result;
      } catch (error: any) {
        log('ERROR', 'API', 'Failed to fetch Shopify plugin config', { merchantId, error: error.message });
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!merchantId,
    retry: 3,
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 10000);
      log('WARN', 'API', `Retrying Shopify plugin config fetch (attempt ${attemptIndex + 1})`, { merchantId, delay });
      return delay;
    },
  });
}
