import { useCreateUserCategoryMutation } from "./categories.create";
import { useDeleteUserCategoryMutation } from "./categories.delete";
import { getAllUserCategoriesQuery } from "./categories.getAll";
import { useUpdateUserCategoryMutation } from "./categories.update";

export const CategoryRepository = {
  getAllUserCategoriesQuery,
  useDeleteUserCategoryMutation,
  useUpdateUserCategoryMutation,
  useCreateUserCategoryMutation,
} as const;
