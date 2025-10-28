import * as React from "react";

interface DelayedLoadingProps {
  children: React.ReactNode;
  isLoading: boolean;
  delay?: number;
}

export function DelayedLoading({
  children,
  isLoading,
  delay = 300,
}: DelayedLoadingProps) {
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return (
    <>
      {showLoading && isLoading && (
        <div className="fixed left-0 top-0 z-50 h-1 w-full overflow-hidden bg-muted">
          <div className="h-full w-full animate-[loading_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      {children}
    </>
  );
}
