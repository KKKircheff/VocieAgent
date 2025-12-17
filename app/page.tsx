import { VoiceChat } from '@/components/voice-chat/voice-chat';
import { GradientCard } from '@/components/shared/gradient-card';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-slate-purple">
      <main className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl w-full">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Voice Agent
          </h1>
          <p className="text-xl text-purple-200">
            Real-time conversation with Gemini Live API
          </p>
        </div>

        <GradientCard className="w-full">
          <VoiceChat />
        </GradientCard>

        <div className="text-center text-sm text-white/40">
          <p>Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local</p>
        </div>
      </main>
    </div>
  );
}
