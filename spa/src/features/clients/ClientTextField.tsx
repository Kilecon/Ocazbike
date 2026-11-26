import { Input } from "@/shared/ui/Input";
import { PhoneInput } from "@/shared/ui/PhoneInput";

interface ClientTextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly required?: boolean;
  readonly type?: string;
  readonly multiline?: boolean;
  readonly className?: string;
  readonly pattern?: string;
  readonly maxLength?: number;
  readonly autoComplete?: string;
  readonly onBlur?: () => void;
  readonly onChange: (value: string) => void;
}

export function ClientTextField({
  id,
  label,
  value,
  required = false,
  type = "text",
  multiline = false,
  className,
  pattern,
  maxLength,
  autoComplete,
  onBlur,
  onChange,
}: ClientTextFieldProps) {
  const FieldInput = type === "tel" ? PhoneInput : Input;
  return (
    <label className="oz-field" htmlFor={id}>
      {label}
      {multiline ? (
        <textarea
          className="oz-input min-h-24 w-full px-3 py-2 font-normal text-foreground disabled:cursor-not-allowed disabled:opacity-70"
          id={id}
          value={value}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <FieldInput
          className={className}
          id={id}
          type={type}
          value={value}
          required={required}
          pattern={pattern}
          maxLength={maxLength}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
    </label>
  );
}
