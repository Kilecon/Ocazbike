import { Input } from "../../../components/ui/input";

interface ClientTextFieldProps {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  multiline?: boolean;
  className?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
}

export function ClientTextField({
  id,
  label,
  value,
  required = false,
  type = "text",
  multiline = false,
  className,
  onBlur,
  onChange,
}: ClientTextFieldProps) {
  return (
    <label
      className="grid gap-1.5 text-sm font-semibold text-foreground"
      htmlFor={id}
    >
      {label}
      {multiline ? (
        <textarea
          className="min-h-24 w-full rounded-md border border-control-border bg-surface px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70"
          id={id}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          className={className}
          id={id}
          type={type}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
    </label>
  );
}
