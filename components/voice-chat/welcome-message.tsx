interface WelcomeMessageProps {
  show: boolean;
}

/**
 * Welcome message with instructions for getting started.
 * Displays initial setup instructions when not connected.
 */
export function WelcomeMessage({ show }: WelcomeMessageProps) {
  if (!show) return null;

  return (
    <div className="text-center text-white/60 text-sm space-y-2">
      <p>Click &quot;Connect&quot; to start a voice session with Gemini</p>
      <p className="text-xs text-white/40">Make sure your microphone is enabled</p>
    </div>
  );
}
