import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export function toastWithProgress(message: string, duration = 5000) {
  toast.custom((t) => <ProgressToast t={t} message={message} duration={duration} />);
}

function ProgressToast({
  t,
  message,
  duration,
}: {
  t: string | number;
  message: string;
  duration: number;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = 100 - (elapsed / duration) * 100;
      setProgress(Math.max(percent, 0));
      if (elapsed >= duration) {
        clearInterval(interval);
        toast.dismiss(t);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [t, duration]);

  return (
    <div className="relative p-4 rounded-md border bg-background text-foreground shadow-lg w-[300px]">
      <div className="mb-2 font-semibold">{message}</div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
