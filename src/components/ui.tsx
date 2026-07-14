import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function FullPageLoader({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Spinner size={40} className="text-emerald-500" />
      <p className="mt-4 text-navy-600 font-medium">{message}</p>
    </div>
  );
}

export function Button({
  children, variant = 'primary', loading = false, disabled, className = '', ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'btn-primary', secondary: 'btn-secondary', outline: 'btn-outline', ghost: 'btn-ghost',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={18} />}
      {children}
    </button>
  );
}

export function EmptyState({
  icon, title, description, action,
}: {
  icon: ReactNode; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-navy-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
