import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="max-w-md mx-auto p-6  rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
      <ul className="list-disc list-inside space-y-2">
        <li>
          <strong>Data Collection:</strong> We do not collect or store any
          personal data from users. Your privacy is important to us, and we will
          not look at your data.
        </li>
        <li>
          <strong>Data Security:</strong> While we take reasonable measures to
          protect your data, we cannot guarantee its security. If your data is
          leaked or compromised, we are not liable for any damages or
          consequences that may arise.
        </li>
        <li>
          <strong>Third-Party Services:</strong> Our service may include links
          to third-party websites or services. We are not responsible for the
          privacy practices or content of these external sites.
        </li>
        <li>
          <strong>Changes to This Policy:</strong> We may update this Privacy
          Policy from time to time. Any changes will be posted on this page, and
          your continued use of the service constitutes acceptance of the
          updated policy.
        </li>
      </ul>
    </div>
  );
}
