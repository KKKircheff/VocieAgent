import { GradientButton } from '@/components/shared/gradient-button';

interface RecordingControlsProps {
  isRecording: boolean;
  isConnected: boolean;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Recording control buttons for starting and stopping audio capture.
 * Only visible when connected. Shows Start Talking or Stop button based on state.
 */
export function RecordingControls({
  isRecording,
  isConnected,
  onStart,
  onStop,
}: RecordingControlsProps) {
  if (!isConnected) return null;

  return (
    <div className="flex justify-center">
      {!isRecording ? (
        <GradientButton variant="green" onClick={onStart}>
          🎤 Start Talking
        </GradientButton>
      ) : (
        <GradientButton variant="red" onClick={onStop}>
          ⏸️ Stop
        </GradientButton>
      )}
    </div>
  );
}
