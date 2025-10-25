import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetMerchantTransactions, useIsCallerAdmin } from '../../hooks/useQueries';
import { Plus, Download, ExternalLink, AlertCircle, TestTube } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaymentTransaction } from '../../backend';

// Logging configuration - set to false for production
// LOGGING: Transaction operations are logged for payment tracking and debugging
const ENABLE_LOGGING = true;

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  if (!ENABLE_LOGGING) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${level}] [${timestamp}] [TRANSACTIONS]`;
  console[level.toLowerCase() as 'info' | 'warn' | 'error'](prefix, message, data || '');
}

export default function TransactionsTab() {
  const { data: isAdmin } = useIsCallerAdmin();
  const merchantId = 'default-merchant';
  const { data: transactions, isLoading } = useGetMerchantTransactions(merchantId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [testTransactions, setTestTransactions] = useState<PaymentTransaction[]>([]);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    currency: 'BTC',
  });

  const handleCreateTestTransaction = () => {
    const transaction: PaymentTransaction = {
      id: `test-tx-${Date.now()}`,
      merchantId,
      amount: BigInt(Math.round(parseFloat(newTransaction.amount) * 100)),
      currency: newTransaction.currency,
      status: 'pending',
      blockchainTxId: undefined,
      createdAt: BigInt(Date.now() * 1000000),
      updatedAt: BigInt(Date.now() * 1000000),
    };

    log('INFO', 'Creating test transaction', {
      transactionId: transaction.id,
      amount: newTransaction.amount,
      currency: newTransaction.currency,
    });

    setTestTransactions((prev) => [transaction, ...prev]);
    setShowCreateDialog(false);
    setNewTransaction({ amount: '', currency: 'BTC' });
    
    log('INFO', 'Test transaction created successfully', { transactionId: transaction.id });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      completed: 'default',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize transition-all duration-300 hover:scale-110 text-xs">
        {status}
      </Badge>
    );
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatAmount = (amount: bigint, currency: string) => {
    return `${(Number(amount) / 100).toFixed(2)} ${currency}`;
  };

  const handleExport = () => {
    if (!transactions) return;

    log('INFO', 'Exporting transactions to CSV', { transactionCount: transactions.length });

    const csv = [
      ['ID', 'Date', 'Amount', 'Currency', 'Status', 'Blockchain TX ID'].join(','),
      ...transactions.map((tx) =>
        [
          tx.id,
          formatDate(tx.createdAt),
          Number(tx.amount) / 100,
          tx.currency,
          tx.status,
          tx.blockchainTxId || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    log('INFO', 'Transactions exported successfully');
  };

  const confirmedTransactions = transactions?.filter((t) => t.status === 'confirmed' || t.status === 'completed') || [];
  const confirmedTotal = confirmedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const allTransactions = [...testTransactions, ...(transactions || [])];

  log('INFO', 'Rendering transactions tab', {
    isAdmin,
    isLoading,
    transactionCount: transactions?.length || 0,
    testTransactionCount: testTransactions.length,
    confirmedTotal: confirmedTotal / 100,
  });

  if (!isAdmin) {
    log('WARN', 'Non-admin user attempted to access transactions tab');
    return (
      <Card className="animate-bounce-in">
        <CardContent className="py-8 sm:py-12 text-center px-4">
          <p className="text-sm sm:text-base text-muted-foreground">Admin access required to view transactions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="animate-bounce-in border-blue-500/50 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
          All transactions use live conversion rates from HyperSync. Test transactions are for plugin testing only and do not persist in history.
        </AlertDescription>
      </Alert>

      <Card className="animate-slide-up hover:shadow-glow transition-all duration-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="font-header text-lg sm:text-xl">Transaction History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage all crypto payment transactions
                {confirmedTransactions.length > 0 && (
                  <span className="block mt-1 text-primary font-semibold">
                    Confirmed Total: ${(confirmedTotal / 100).toFixed(2)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!transactions?.length}
                className="transition-all duration-300 hover:scale-105 hover:border-primary/50 text-xs sm:text-sm"
              >
                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Export</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  log('INFO', 'Opening test transaction dialog');
                  setShowCreateDialog(true);
                }}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow animate-gradient text-xs sm:text-sm"
              >
                <TestTube className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Test</span>
                <span className="xs:hidden">+</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full animate-pulse" />
              ))}
            </div>
          ) : allTransactions && allTransactions.length > 0 ? (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs sm:text-sm">Transaction ID</TableHead>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                        <TableHead className="text-xs sm:text-sm">Currency</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm">Blockchain TX</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allTransactions.map((transaction, index) => (
                        <TableRow
                          key={transaction.id}
                          className="hover:bg-muted/50 transition-all duration-300 animate-fade-scale"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <TableCell className="font-mono text-xs sm:text-sm">
                            {transaction.id}
                            {transaction.id.startsWith('test-') && (
                              <Badge variant="outline" className="ml-2 text-xs">Test</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{formatDate(transaction.createdAt)}</TableCell>
                          <TableCell className="font-semibold text-xs sm:text-sm">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="transition-all duration-300 hover:scale-110 text-xs">
                              {transaction.currency}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>
                            {transaction.blockchainTxId ? (
                              <Button variant="ghost" size="sm" className="h-6 sm:h-8 px-2 transition-all duration-300 hover:scale-110">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="py-8 sm:py-12 text-center animate-bounce-in">
              <p className="text-sm sm:text-base text-muted-foreground mb-4">No transactions yet</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                size="sm"
                className="transition-all duration-300 hover:scale-105 hover:border-primary/50 text-xs sm:text-sm"
              >
                <TestTube className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Create Your First Test Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="animate-scale-in sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="font-header text-base sm:text-lg flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              Create Test Transaction
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create a test transaction for plugin testing. Test transactions do not persist in transaction history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs sm:text-sm">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newTransaction.amount}
                onChange={(e) => {
                  log('INFO', 'Test transaction amount changed', { amount: e.target.value });
                  setNewTransaction({ ...newTransaction, amount: e.target.value });
                }}
                className="transition-all duration-300 hover:border-primary/50 focus:shadow-glow text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-xs sm:text-sm">Currency</Label>
              <Select
                value={newTransaction.currency}
                onValueChange={(value) => {
                  log('INFO', 'Test transaction currency changed', { currency: value });
                  setNewTransaction({ ...newTransaction, currency: value });
                }}
              >
                <SelectTrigger id="currency" className="transition-all duration-300 hover:border-primary/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="ICP">Internet Computer (ICP)</SelectItem>
                  <SelectItem value="PLT">Concordium PLT Stablecoin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                log('INFO', 'Test transaction dialog cancelled');
                setShowCreateDialog(false);
              }}
              className="transition-all duration-300 hover:scale-105 w-full sm:w-auto text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTestTransaction}
              disabled={!newTransaction.amount}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow animate-gradient w-full sm:w-auto text-xs sm:text-sm"
            >
              Create Test Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
