import { customAlphabet } from "nanoid";

const generateDnsSafeId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789-", 21);

export const genertateId = () => {
  return generateDnsSafeId();
};
