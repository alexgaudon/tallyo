import { useGenerateUserAuthTokenMutation } from "./auth.generateAuthToken";
import { getUserAuthQuery } from "./auth.get";

export const AuthRepository = {
  getUserAuthQuery,
  useGenerateUserAuthTokenMutation,
} as const;
