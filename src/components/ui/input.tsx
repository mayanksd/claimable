import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground h-10 w-full min-w-0 rounded-[10px] border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
