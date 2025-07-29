import React, { useState } from 'react';
import { CoinSelectionStrategy } from '@/services/wallet/UTXOSelectionService';
import {
  Settings,
  Info,
  Zap,
  Shield,
  Layers,
  Target,
  Coins,
  UserCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UTXOSelectionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (options: {
    strategy: CoinSelectionStrategy;
    feeRate?: number;
    maxInputs?: number;
    minConfirmations?: number;
  }) => void;
  currentOptions?: {
    strategy?: CoinSelectionStrategy;
    feeRate?: number;
    maxInputs?: number;
    minConfirmations?: number;
  };
}

export function UTXOSelectionSettings({
  isOpen,
  onClose,
  onApply,
  currentOptions = {},
}: UTXOSelectionSettingsProps) {
  const [strategy, setStrategy] = useState<CoinSelectionStrategy>(
    currentOptions.strategy || CoinSelectionStrategy.BEST_FIT,
  );
  const [feeRate, setFeeRate] = useState(currentOptions.feeRate || 10000);
  const [maxInputs, setMaxInputs] = useState(currentOptions.maxInputs || 20);
  const [minConfirmations, setMinConfirmations] = useState(currentOptions.minConfirmations || 0);
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!isOpen) return null;

  const strategies = [
    {
      value: CoinSelectionStrategy.BEST_FIT,
      name: 'Best Fit',
      description: 'Optimal balance of efficiency and fees',
      icon: <Target className="w-4 h-4" />,
      recommended: true,
    },
    {
      value: CoinSelectionStrategy.SMALLEST_FIRST,
      name: 'Minimize Fees',
      description: 'Select smallest UTXOs first to reduce transaction size',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      value: CoinSelectionStrategy.LARGEST_FIRST,
      name: 'Fewer Inputs',
      description: 'Use larger UTXOs for simpler transactions',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      value: CoinSelectionStrategy.PRIVACY_FOCUSED,
      name: 'Privacy Enhanced',
      description: 'Use multiple inputs for better privacy',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      value: CoinSelectionStrategy.CONSOLIDATE_DUST,
      name: 'Consolidate Dust',
      description: 'Include small UTXOs to clean up wallet',
      icon: <Coins className="w-4 h-4" />,
    },
    {
      value: CoinSelectionStrategy.MANUAL,
      name: 'Manual Selection',
      description: 'Choose specific UTXOs for your transaction',
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  const handleApply = () => {
    onApply({
      strategy,
      feeRate,
      maxInputs,
      minConfirmations,
    });
    onClose();
  };

  const handleReset = () => {
    setStrategy(CoinSelectionStrategy.BEST_FIT);
    setFeeRate(10000);
    setMaxInputs(20);
    setMinConfirmations(0);
  };

  const renderContent = () => (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium">UTXO Selection Strategy</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>How your transaction inputs are selected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-2">
          {strategies.map((s) => (
            <Card
              key={s.value}
              className={`cursor-pointer transition-colors ${
                strategy === s.value ? 'border-primary bg-primary/10' : 'hover:border-border/60'
              }`}
              onClick={() => setStrategy(s.value)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <input
                  type="radio"
                  name="strategy"
                  value={s.value}
                  checked={strategy === s.value}
                  onChange={(e) => setStrategy(e.target.value as CoinSelectionStrategy)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <span className="font-medium">{s.name}</span>
                    {s.recommended && (
                      <Badge
                        variant="outline"
                        className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                      >
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
        <div className="space-y-4">
          {/* Fee Rate */}
          <div className="space-y-2">
            <Label htmlFor="fee-rate">Network Fee (satoshis)</Label>
            <Input
              id="fee-rate"
              type="number"
              value={feeRate}
              onChange={(e) => setFeeRate(parseInt(e.target.value) || 10000)}
              min="1000"
              max="100000"
            />
            <p className="text-xs text-muted-foreground">Default: 10,000 sats (0.0001 AVN)</p>
          </div>

          {/* Max Inputs */}
          <div className="space-y-2">
            <Label htmlFor="max-inputs">Maximum Inputs</Label>
            <Input
              id="max-inputs"
              type="number"
              value={maxInputs}
              onChange={(e) => setMaxInputs(parseInt(e.target.value) || 20)}
              min="1"
              max="100"
            />
            <p className="text-xs text-muted-foreground">
              Limit the number of UTXOs used in the transaction
            </p>
          </div>

          {/* Min Confirmations */}
          <div className="space-y-2">
            <Label htmlFor="min-confirmations">Minimum Confirmations</Label>
            <Input
              id="min-confirmations"
              type="number"
              value={minConfirmations}
              onChange={(e) => setMinConfirmations(parseInt(e.target.value) || 0)}
              min="0"
              max="10"
            />
            <p className="text-xs text-muted-foreground">
              Only use UTXOs with this many confirmations or more
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="flex flex-col max-h-[95vh]">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Transaction Settings
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4">{renderContent()}</div>

          <DrawerFooter className="flex-shrink-0 gap-2 flex">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={onClose} variant="secondary" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Settings
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Transaction Settings
          </DialogTitle>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="mt-6 gap-2 flex">
          <Button onClick={handleReset} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
