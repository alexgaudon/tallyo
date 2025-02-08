import { createUserCategoryMutation } from "./categories.create";
import { deleteUserCategoryMutation } from "./categories.delete";
import { getAllUserCategoriesQuery } from "./categories.getAll";
import { updateUserCategoryMutation } from "./categories.update";

export const CategoryRepository = {
  getAllUserCategoriesQuery: getAllUserCategoriesQuery,
  deleteUserCategoryMutation: () => deleteUserCategoryMutation(),
  updateUserCategoryMutation: () => updateUserCategoryMutation(),
  createUserCategoryMutation: () => createUserCategoryMutation(),
} as const;
