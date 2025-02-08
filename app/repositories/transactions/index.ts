import { createUserTransactionMutation } from "./transactions.create";
import { deleteUserTransactionMutation } from "./transactions.delete";
import { getAllUserTransactionsQuery } from "./transactions.getAll";
import { setRecommendedTransactionCategory } from "./transactions.recommendCategory";
import { splitUserTransactionMutation } from "./transactions.split";
import { updateUserTransactionMutation } from "./transactions.update";

export const TransactionRepository = {
  getAllUserTransactionsQuery: getAllUserTransactionsQuery,
  updateUserTransactionMutation: () => updateUserTransactionMutation(),
  setRecommendedTransactionCategory: () => setRecommendedTransactionCategory(),
  createUserTransactionMutation: () => createUserTransactionMutation(),
  deleteUserTransactionMutation: () => deleteUserTransactionMutation(),
  splitUserTransactionMutation: () => splitUserTransactionMutation(),
} as const;
