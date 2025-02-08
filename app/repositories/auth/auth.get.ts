import { keys } from "@/repositories/keys";
import { getAuth } from "@/server/functions";
import { queryOptions } from "@tanstack/react-query";

export const getUserAuthQuery = () =>
  queryOptions({
    queryKey: keys.auth.queries.all,
    queryFn: () => getAuth(),
  });
