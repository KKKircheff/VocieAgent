import { GradientButton } from '@/components/shared/gradient-button';
import { StatusIndicator } from './status-indicator';

interface ConnectionControlsProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * Connection control panel with status indicator and connect/disconnect buttons.
 * Shows Connect button when disconnected, Disconnect button when connected.
 */
export function ConnectionControls({
  isConnected,
  onConnect,
  onDisconnect,
}: ConnectionControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIndicator isConnected={isConnected} />

      <div className="flex gap-3">
        {!isConnected ? (
          <GradientButton variant="purple-pink" onClick={onConnect}>
            Connect
          </GradientButton>
        ) : (
          <GradientButton variant="ghost" onClick={onDisconnect}>
            Disconnect
          </GradientButton>
        )}
      </div>
    </div>
  );
}
