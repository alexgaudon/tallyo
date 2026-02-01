import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";
import type { WebhookResult } from "../../../server/src/routers";

export function WebhookButton(props: React.ComponentProps<typeof Button>) {
  const [results, setResults] = useState<WebhookResult[] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate: triggerWebhookRefresh, isPending } = useMutation(
    orpc.meta.triggerWebhookRefresh.mutationOptions(),
  );

  const handleRefreshWebhooks = () => {
    triggerWebhookRefresh(undefined, {
      onSuccess: (data) => {
        setResults(data.results);
        setIsDialogOpen(true);
        const successCount = data.results.filter((r) => r.success).length;
        const totalCount = data.results.length;
        toast.success("Webhooks triggered!", {
          description: `${successCount}/${totalCount} webhooks succeeded.`,
          duration: 3000,
        });
      },
      onError: (error: unknown) => {
        toast.error("Failed to trigger webhooks", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred while triggering webhooks.",
          duration: 3000,
        });
      },
    });
  };

  return (
    <>
      <Button
        {...props}
        size="icon"
        variant="outline"
        onClick={handleRefreshWebhooks}
        disabled={isPending}
      >
        <RefreshCw className={`h-5 w-5 ${isPending ? "animate-spin" : ""}`} />
        <span className="sr-only">Refresh webhooks</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Results</DialogTitle>
            <DialogDescription>
              Results from triggering all webhook URLs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {results && results.length > 0 ? (
              results.map((result) => (
                <Card key={result.url}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate">
                        {result.url}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Status: </span>
                      {result.status !== null ? (
                        <span>
                          {result.status} {result.statusText}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {result.statusText}
                        </span>
                      )}
                    </div>
                    {result.body !== null && (
                      <div className="text-sm">
                        <span className="font-medium">Response: </span>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {typeof result.body === "string"
                            ? result.body
                            : JSON.stringify(result.body, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No webhooks configured
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
