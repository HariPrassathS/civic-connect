export default function VoiceAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-950 dark:to-slate-900">
      {children}
    </div>
  );
}
