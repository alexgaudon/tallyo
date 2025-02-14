import { getUserMeta } from "./meta.get";
import { useUpdateUserMetaMutation } from "./meta.update";

export const MetaRepository = {
  getUserMeta,
  useUpdateUserMetaMutation,
} as const;
