import { Input } from '@/components/ui/input';

interface AuthFormFieldProps {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  error: string | null;
}

/** Reusable labelled input field for auth forms with error display. */
export function AuthFormField({
  label,
  name,
  type,
  placeholder,
  autoComplete,
  error,
}: AuthFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className="h-10 rounded-xl"
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
