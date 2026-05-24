"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmationState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-denied"
  | "output-available"
  | "output-error";

type ConfirmationApproval = {
  id: string;
  approved?: boolean;
};

type ConfirmationContextValue = {
  approval: ConfirmationApproval;
  state: ConfirmationState;
};

const ConfirmationContext = React.createContext<ConfirmationContextValue | null>(
  null,
);

function useConfirmation() {
  const context = React.useContext(ConfirmationContext);
  if (!context) {
    throw new Error("Confirmation components must be used inside Confirmation.");
  }
  return context;
}

export type ConfirmationProps = React.ComponentProps<"div"> & {
  approval?: ConfirmationApproval;
  state: ConfirmationState;
};

export function Confirmation({
  approval,
  state,
  className,
  children,
  ...props
}: ConfirmationProps) {
  if (!approval || state === "input-streaming" || state === "input-available") {
    return null;
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <div
        role="alert"
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-xs",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ConfirmationContext.Provider>
  );
}

export type ConfirmationTitleProps = React.ComponentProps<"div">;

export function ConfirmationTitle({
  className,
  ...props
}: ConfirmationTitleProps) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

export type ConfirmationRequestProps = React.ComponentProps<"div">;

export function ConfirmationRequest(props: ConfirmationRequestProps) {
  const { state } = useConfirmation();
  if (state !== "approval-requested") {
    return null;
  }

  return <div {...props} />;
}

export type ConfirmationAcceptedProps = React.ComponentProps<"div">;

export function ConfirmationAccepted({
  className,
  ...props
}: ConfirmationAcceptedProps) {
  const { approval, state } = useConfirmation();
  if (
    approval.approved !== true ||
    (state !== "approval-responded" && state !== "output-available")
  ) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-2 text-emerald-700", className)}
      {...props}
    />
  );
}

export type ConfirmationRejectedProps = React.ComponentProps<"div">;

export function ConfirmationRejected({
  className,
  ...props
}: ConfirmationRejectedProps) {
  const { approval, state } = useConfirmation();
  if (
    approval.approved !== false ||
    (state !== "approval-responded" && state !== "output-denied")
  ) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-2 text-red-700", className)}
      {...props}
    />
  );
}

export type ConfirmationActionsProps = React.ComponentProps<"div">;

export function ConfirmationActions({
  className,
  ...props
}: ConfirmationActionsProps) {
  const { state } = useConfirmation();
  if (state !== "approval-requested") {
    return null;
  }

  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export type ConfirmationActionProps = React.ComponentProps<typeof Button>;

export function ConfirmationAction({
  className,
  size = "sm",
  ...props
}: ConfirmationActionProps) {
  return (
    <Button
      className={cn("h-8 rounded-full px-3 text-xs", className)}
      size={size}
      {...props}
    />
  );
}
