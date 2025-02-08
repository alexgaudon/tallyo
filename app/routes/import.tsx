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
    await context.queryClient.ensureQueryData(
      CategoryRepository.getAllUserCategoriesQuery()
    );
  },
});

function RouteComponent() {
  const { mutateAsync, isPending } =
    AuthRepository.generateUserAuthTokenMutation();
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
      {/* <p>
        Tallyo is different from traditional finance apps, due to the "developer
        focused" aspect of it. This means the preferred way to import
        transactions is via the API Route exposed at{" "}
        <pre>/api/new-transactions</pre>
      </p> */}

      <div className="mt-20">
        <Import />
      </div>
    </div>
  );
}
