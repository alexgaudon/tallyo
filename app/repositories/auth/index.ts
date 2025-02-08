import { generateUserAuthTokenMutation } from "./auth.generateAuthToken";
import { getUserAuthQuery } from "./auth.get";

export const AuthRepository = {
  getUserAuthQuery: getUserAuthQuery,
  generateUserAuthTokenMutation: () => generateUserAuthTokenMutation(),
} as const;
