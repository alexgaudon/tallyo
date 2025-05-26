import { formatDateISO8601 } from "@/lib/utils";

function createKey<T extends string, U extends Record<string, string | string[]> = Record<string, never>>(
  base: T,
  subkeys: U = {} as U,
) {
  return {
    all: [base] as string[],
    ...(Object.fromEntries(
      Object.entries(subkeys).map(([key, path]) => [key, [base, ...(Array.isArray(path) ? path : [path])] as string[]]),
    ) as U),
  };
}

export const getKeyFromDate = (date: Date | undefined) => {
  return formatDateISO8601(date ?? new Date());
};

export const keys = {
  insights: {
    mutations: createKey("insights", {
      question: ["question"],
    }),
  },
  auth: {
    queries: createKey("auth", {}),
    mutations: createKey("auth", {
      generateAuthToken: ["generateAuthToken"],
    }),
  },
  charts: {
    queries: createKey("charts", {
      stats: ["stats"],
      vendors: ["top-vendors"],
      monthlyExpenses: ["monthly-expenses"],
      incomeVsExpenses: ["income-vs-expenses"],
      categoryBreakdown: ["category-breakdown"],
    }),
  },
  meta: {
    queries: createKey("meta", {}),
    mutations: createKey("meta", {
      update: ["update"],
    }),
  },
  transactions: {
    queries: createKey("transactions", {}),
    mutations: createKey("transactions", {
      update: ["update"],
    }),
  },
  categories: {
    queries: createKey("categories", {}),
    mutations: createKey("categories", {
      create: ["create"],
      delete: ["delete"],
      update: ["update"],
    }),
  },
};
