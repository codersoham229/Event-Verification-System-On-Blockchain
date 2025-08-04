import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactionStatus as TransactionStatusType } from '@/types/web3';
import { Loader2, CheckCircle, XCircle, ExternalLink, X } from 'lucide-react';

interface TransactionStatusProps {
  status: TransactionStatusType;
  onClose?: () => void;
  className?: string;
}

export function TransactionStatus({ status, onClose, className }: TransactionStatusProps) {
  if (status.status === 'idle') return null;

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'pending':
        return 'Transaction in progress...';
      case 'success':
        return 'Transaction completed successfully!';
      case 'error':
        return status.error || 'Transaction failed';
      default:
        return '';
    }
  };

  const getTextColor = () => {
    switch (status.status) {
      case 'pending':
        return 'text-blue-800';
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-slate-800';
    }
  };

  const openEtherscan = () => {
    if (status.hash) {
      window.open(`https://sepolia.etherscan.io/tx/${status.hash}`, '_blank');
    }
  };

  return (
    <Alert className={`${getStatusColor()} ${className}`} data-testid="alert-transaction-status">
      <div className="flex items-start space-x-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <AlertDescription className={`font-medium ${getTextColor()}`}>
            {getStatusMessage()}
          </AlertDescription>
          
          {status.hash && (
            <div className="mt-2 flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-xs truncate">
                {status.hash.slice(0, 10)}...{status.hash.slice(-8)}
              </Badge>
              <Button
                onClick={openEtherscan}
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                data-testid="button-view-transaction"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </Button>
            </div>
          )}
        </div>
        
        {onClose && (
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            data-testid="button-close-transaction-status"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
