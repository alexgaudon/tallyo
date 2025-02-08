import { getUserMeta } from "./meta.get";
import { updateUserMetaMutation } from "./meta.update";

export const MetaRepository = {
  getUserMeta: getUserMeta,
  updateUserMetaMutation: () => updateUserMetaMutation(),
} as const;
