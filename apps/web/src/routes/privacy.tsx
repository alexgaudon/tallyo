import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
	component: PrivacyComponent,
});

function PrivacyComponent() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

			<div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
				<section>
					<h2 className="text-2xl font-semibold mb-4">
						1. Information We Collect
					</h2>
					<p>
						We collect information you provide directly to us, such as when you
						create an account, use our services, or contact us for support. This
						may include:
					</p>
					<ul className="list-disc pl-6 mt-2">
						<li>Account information (email address, username)</li>
						<li>Financial transaction data you choose to input</li>
						<li>Usage data and preferences</li>
						<li>Communications with our support team</li>
					</ul>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						2. How We Use Your Information
					</h2>
					<p>We use the information we collect to:</p>
					<ul className="list-disc pl-6 mt-2">
						<li>Provide, maintain, and improve our services</li>
						<li>Process transactions and send related information</li>
						<li>Send technical notices and support messages</li>
						<li>Respond to your comments and questions</li>
						<li>Analyze usage patterns to improve user experience</li>
					</ul>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						3. Information Sharing
					</h2>
					<p>
						We do not sell, trade, or otherwise transfer your personal
						information to third parties without your consent, except as
						described in this policy. We may share your information in the
						following circumstances:
					</p>
					<ul className="list-disc pl-6 mt-2">
						<li>With your explicit consent</li>
						<li>To comply with legal obligations</li>
						<li>To protect our rights and prevent fraud</li>
						<li>In connection with a business transfer or merger</li>
					</ul>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
					<p>
						We implement appropriate technical and organizational measures to
						protect your personal information against unauthorized access,
						alteration, disclosure, or destruction. However, no method of
						transmission over the internet is 100% secure.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
					<p>
						We retain your personal information for as long as necessary to
						provide our services and fulfill the purposes outlined in this
						policy, unless a longer retention period is required by law.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
					<p>
						Depending on your location, you may have certain rights regarding
						your personal information, including:
					</p>
					<ul className="list-disc pl-6 mt-2">
						<li>The right to access your personal information</li>
						<li>The right to correct inaccurate information</li>
						<li>The right to delete your personal information</li>
						<li>The right to restrict processing</li>
						<li>The right to data portability</li>
					</ul>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						7. Cookies and Tracking
					</h2>
					<p>
						We use cookies and similar tracking technologies to collect
						information about your browsing activities and to provide
						personalized content. You can control cookie settings through your
						browser preferences.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						8. Third-Party Services
					</h2>
					<p>
						Our service may contain links to third-party websites or services.
						We are not responsible for the privacy practices of these third
						parties. We encourage you to review their privacy policies.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
					<p>
						Our service is not intended for children under 13 years of age. We
						do not knowingly collect personal information from children under
						13. If we become aware of such collection, we will take steps to
						delete the information.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						10. International Data Transfers
					</h2>
					<p>
						Your information may be transferred to and processed in countries
						other than your own. We ensure appropriate safeguards are in place
						to protect your information during such transfers.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						11. Changes to This Policy
					</h2>
					<p>
						We may update this Privacy Policy from time to time. We will notify
						you of any material changes by posting the new policy on this page
						and updating the "Last updated" date.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
					<p>
						If you have any questions about this Privacy Policy or our privacy
						practices, please contact us through the appropriate channels
						provided in the application.
					</p>
				</section>

				<div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
					<p>Last updated: {new Date().toLocaleDateString()}</p>
				</div>
			</div>
		</div>
	);
}
