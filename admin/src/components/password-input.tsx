"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.ComponentProps<"input">, "type"> & {
  inputClassName?: string;
};

export function PasswordInput({ inputClassName = "", className = "", ...rest }: Props): ReactElement {
  const [show, setShow] = useState(false);
  const inputClasses = ["w-full min-w-0 pr-11", className, inputClassName]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="relative w-full min-w-0">
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={inputClasses}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
