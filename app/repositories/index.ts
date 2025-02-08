import { QueryClient } from "@tanstack/react-query";

export const ensureQueryData = (client: QueryClient, ...data: any[]) => {
  return Promise.all(data.map((x) => client.ensureQueryData(x)));
};
