import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export function ConfirmPassword({
  onConfirm,
  onCancel,
}: {
  onConfirm: (apiKey: string) => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (_e: FormEvent) => {
    setIsLoading(true);

    try {
      const tokenRes = await orpc.settings.generateAuthToken.call();

      // Pass the generated token to the parent component
      onConfirm(tokenRes.token);
      setIsLoading(false);
    } catch (_error) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          This will revoke your old token!
        </h2>
        <p>Are you sure you want to continue?</p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" onClick={handleSubmit}>
          {isLoading ? "Confirming..." : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            onCancel();
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
