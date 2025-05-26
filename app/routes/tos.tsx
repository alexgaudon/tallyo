import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tos")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="max-w-md mx-auto p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Terms of Service</h2>
      <ul className="list-disc list-inside space-y-2">
        <li>
          Be Respectful: Treat others with kindness and respect. Harassment or abusive behavior will not be tolerated.
        </li>
        <li>
          No Warranty: This service is provided "as is" without any guarantees or warranties. Use it at your own risk.
        </li>
        <li>
          Support Issues: For any problems or inquiries, please visit our GitHub repository for assistance and support.
        </li>
        <li>Compliance: By using this service, you agree to comply with these terms and any applicable laws.</li>
      </ul>
    </div>
  );
}
