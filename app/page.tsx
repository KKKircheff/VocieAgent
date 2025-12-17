import { VoiceChat } from '@/components/VoiceChat';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl w-full">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Voice Agent
          </h1>
          <p className="text-xl text-purple-200">
            Real-time conversation with Gemini Live API
          </p>
        </div>

        <div className="w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <VoiceChat />
        </div>

        <div className="text-center text-sm text-white/40">
          <p>Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local</p>
        </div>
      </main>
    </div>
  );
}
