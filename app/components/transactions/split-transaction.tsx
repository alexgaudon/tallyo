import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { AlertDialogHeader } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import AmountDisplay from "./amount-display";

import { TransactionRepository } from "@/repositories/transactions";
import type { Transaction } from "@/repositories/transactions/transactions.getAll";

type DisplayType = {
  vendor: string;
  amount: number;
};

function TransactionDisplay({
  oldTransaction,
  newTransactions,
}: {
  oldTransaction: DisplayType;
  newTransactions: DisplayType[];
}) {
  return (
    <div className="grid grid-cols-7">
      <div className="flex flex-col justify-center col-span-3">
        <div className="font-medium">{oldTransaction.vendor}</div>
        <div className="text-muted-foreground">
          <AmountDisplay amount={oldTransaction.amount} />
        </div>
      </div>
      <div className="flex justify-center items-center col-span-1">
        <ArrowRightIcon />
      </div>
      <div className="flex flex-col justify-center col-span-3">
        {newTransactions.map((transaction) => {
          return (
            <>
              <div className="font-medium">{transaction.vendor}</div>
              <div className="text-muted-foreground">
                <AmountDisplay amount={transaction.amount} />
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}

export function SplitTransaction({
  transaction,
  open,
  setOpen,
}: {
  transaction: Transaction;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [newAmount, setNewAmount] = useState("0.00");

  const { mutateAsync } = TransactionRepository.splitUserTransactionMutation();

  const transform = (val: number) => {
    if (transaction.amount < 0) {
      return val * -1;
    }
    return val;
  };

  const getNewTransactions = (splitAmount: number) => {
    return [
      {
        vendor: transaction.vendor,
        amount: transaction.amount - splitAmount,
      },
      {
        vendor: transaction.vendor,
        amount: splitAmount,
      },
    ];
  };

  const realAmount = transform(
    Math.round(Number(Number(newAmount).toFixed(2)) * 100),
  );

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Split this Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            What portion of this transaction do you want to split?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-center items-center">
          $
          <Input
            type="number"
            value={newAmount}
            onChange={(v) => {
              setNewAmount(v.target.value);
            }}
          ></Input>
        </div>

        <TransactionDisplay
          oldTransaction={{
            amount: transaction.amount,
            vendor: transaction.vendor,
          }}
          newTransactions={getNewTransactions(realAmount)}
        />

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setOpen(false);
              setNewAmount("0.00");
            }}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={async () => {
              setOpen(false);
              setNewAmount("0.00");

              const newTransactions = getNewTransactions(realAmount);

              mutateAsync({
                transactionId: transaction.id,
                firstAmount: newTransactions[0].amount,
                secondAmount: newTransactions[1].amount,
              });
            }}
          >
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
