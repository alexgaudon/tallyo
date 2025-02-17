import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDateISO8601 } from "@/lib/utils";
import { TransactionRepository } from "@/repositories/transactions";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Toaster } from "../ui/toaster";

export function CreateTransactionForm() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      vendor: "",
      date: new Date(),
      amount: "",
    },
    onSubmit: async ({ value, formApi }) => {
      const res = await mutateAsync({
        vendor: value.vendor,
        amount: Number(value.amount) * 100,
        date: formatDateISO8601(value.date),
      });

      if (res) {
        setOpen(false);
        formApi.reset();
      }

      toast({
        variant: res ? "default" : "destructive",
        description: res
          ? "Created transaction successfully."
          : "An error has occurred. Please try again.",
      });
    },
  });

  const { mutateAsync, isError, error } =
    TransactionRepository.useCreateUserTransactionMutation();

  return (
    <>
      <Toaster />
      <Dialog
        open={open}
        onOpenChange={(newValue) => {
          setOpen(newValue);
        }}
      >
        <DialogTrigger asChild>
          <Button>Create New Transaction</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center">
              {isError && <p className="text-red-500">{error.message}</p>}
              <DialogTitle className="text-center">
                <h1 className="font-bold text-2xl">Create a Transaction</h1>
                <DialogDescription className="text-muted-foreground">
                  Enter a vendor, amount, and a date.
                </DialogDescription>
              </DialogTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                className="space-y-4 w-full max-w-md"
              >
                <div>
                  <Label>Vendor</Label>
                  <form.Field
                    validators={{
                      onChange: ({ value, fieldApi }) =>
                        value.length <= 0 && fieldApi.state.meta.isTouched
                          ? "This field is required"
                          : undefined,
                    }}
                    name="vendor"
                    children={(field) => (
                      <>
                        <Input
                          maxLength={50}
                          autoComplete="off"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                          }}
                          placeholder="Enter vendor name"
                          className="mt-1"
                        />
                        {field.state.meta.errors && (
                          <em role="alert" className="text-red-400">
                            {field.state.meta.errors.join(", ")}
                          </em>
                        )}
                      </>
                    )}
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <form.Field
                    validators={{
                      onChange: ({ value, fieldApi }) =>
                        (value === "0" || value.length === 0) &&
                        fieldApi.state.meta.isTouched
                          ? "This field is required"
                          : undefined,
                    }}
                    name="amount"
                    children={(field) => (
                      <>
                        <Input
                          maxLength={50}
                          type="number"
                          autoComplete="off"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                          }}
                          placeholder="Enter amount"
                          className="mt-1"
                        />
                        {field.state.meta.errors && (
                          <em role="alert" className="text-red-400">
                            {field.state.meta.errors.join(", ")}
                          </em>
                        )}
                      </>
                    )}
                  />
                </div>
                <div>
                  <div>
                    <Label>Date</Label>
                  </div>
                  <form.Field
                    validators={{
                      onChange: ({ value, fieldApi }) =>
                        !value && fieldApi.state.meta.isTouched
                          ? "This field is required"
                          : undefined,
                    }}
                    name="date"
                    children={(field) => (
                      <>
                        <DatePicker
                          value={field.state.value}
                          onChange={(val) => {
                            field.handleChange(val ?? new Date());
                          }}
                        />
                        {field.state.meta.errors && (
                          <em role="alert" className="text-red-400">
                            {field.state.meta.errors.join(", ")}
                          </em>
                        )}
                      </>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={form.state.isSubmitting}>
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
