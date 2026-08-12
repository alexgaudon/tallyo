import { cn } from "@/lib/utils";

interface BuildIdentifierProps {
  className?: string;
}

export function BuildIdentifier({ className }: BuildIdentifierProps) {
  const commit = import.meta.env.VITE_GIT_COMMIT;
  const buildTime = import.meta.env.VITE_BUILD_TIME;

  if (!commit && !buildTime) {
    return null;
  }

  return (
    <p className={cn("font-mono text-xs text-muted-foreground/60", className)}>
      {commit ? `build ${commit}` : null}
      {commit && buildTime ? " · " : null}
      {buildTime ? `built ${new Date(buildTime).toISOString()}` : null}
    </p>
  );
}
