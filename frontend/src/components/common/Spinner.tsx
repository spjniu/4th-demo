import { Loader2 } from 'lucide-react';

type SpinnerProps = {
  size?: number;
  label?: string;
};

export default function Spinner({ size = 24, label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-blue-400" style={{ width: size, height: size }} />
      {label && <p className="text-blue-200 text-sm">{label}</p>}
    </div>
  );
}
