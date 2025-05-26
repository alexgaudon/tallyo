import { AuthRepository } from "@/repositories/auth";
import { MetaRepository } from "@/repositories/meta";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";

export function UnreviewedBanner() {
  const { data, isLoading } = useQuery({
    ...MetaRepository.getUserMeta(),
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const authQuery = useQuery(AuthRepository.getUserAuthQuery());

  const state = useRouterState();

  if (
    state.location.pathname === "/transactions" ||
    isLoading ||
    data?.unreviewed == 0 ||
    !authQuery.data?.isAuthenticated
  ) {
    return null;
  }

  return (
    <div className="relative flex sm:before:flex-1 items-center gap-x-6 bg-gray-50 px-6 sm:px-3.5 py-2.5 overflow-hidden isolate">
      <div
        className="top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 absolute blur-2xl transform-gpu -translate-y-1/2"
        aria-hidden="true"
      ></div>
      <div
        className="top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 absolute blur-2xl transform-gpu -translate-y-1/2"
        aria-hidden="true"
      ></div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-gray-900 text-sm/6">You have {data?.unreviewed ?? 0} unreviewed transactions.</p>
        <Link
          to="/transactions"
          search={{
            unreviewed: true,
            filter: "",
            page: 1,
          }}
          className="flex-none bg-gray-900 hover:bg-gray-700 shadow-xs px-3.5 py-1 rounded-full font-semibold text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Review them now <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="flex flex-1 justify-end">
        <button type="button" className="-m-3 p-3 focus-visible:outline-offset-[-4px]">
          <span className="sr-only">Dismiss</span>
          <svg
            className="text-gray-900 size-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            data-slot="icon"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
