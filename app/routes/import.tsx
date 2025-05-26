import Import from "@/components/import/import";
import { Button } from "@/components/ui/button";
import { AuthRepository } from "@/repositories/auth";
import { CategoryRepository } from "@/repositories/categories";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/import")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/signin",
        from: "/import",
      });
    }
    await context.queryClient.prefetchQuery(CategoryRepository.getAllUserCategoriesQuery());
  },
});

function RouteComponent() {
  const { mutateAsync, isPending } = AuthRepository.useGenerateUserAuthTokenMutation();
  return (
    <div className="p-8">
      <Button
        disabled={isPending}
        onClick={async () => {
          const res = await mutateAsync({});
          alert(`Your new auth token is: ${res.token}`);
        }}
      >
        Generate Auth Token
      </Button>
      <h1 className="text-2xl">Importing Transactions</h1>
      <div className="mt-20">
        <Import />
      </div>
    </div>
  );
}
