import { useCreateUserTransactionMutation } from "./transactions.create";
import { useDeleteUserTransactionMutation } from "./transactions.delete";
import { getAllUserTransactionsQuery } from "./transactions.getAll";
import { useSetRecommendedTransactionCategoryMutation } from "./transactions.recommendCategory";
import { useSplitUserTransactionMutation } from "./transactions.split";
import { useUpdateUserTransactionMutation } from "./transactions.update";

export const TransactionRepository = {
  getAllUserTransactionsQuery,
  useUpdateUserTransactionMutation,
  useSetRecommendedTransactionCategoryMutation,
  useCreateUserTransactionMutation,
  useDeleteUserTransactionMutation,
  useSplitUserTransactionMutation,
} as const;
