import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
	component: TermsComponent,
});

function TermsComponent() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

			<div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
				<section>
					<h2 className="text-2xl font-semibold mb-4">
						1. Acceptance of Terms
					</h2>
					<p>
						By accessing and using Tallyo ("the Service"), you accept and agree
						to be bound by the terms and provision of this agreement. If you do
						not agree to abide by the above, please do not use this service.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						2. Description of Service
					</h2>
					<p>
						Tallyo is a personal finance inspection tool that helps users track
						and analyze their financial transactions, categorize expenses, and
						generate reports. The Service is provided "as is" and on an "as
						available" basis.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
					<p>
						To access certain features of the Service, you may be required to
						create an account. You are responsible for maintaining the
						confidentiality of your account credentials and for all activities
						that occur under your account.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						4. User Data and Privacy
					</h2>
					<p>
						Your privacy is important to us. Please review our Privacy Policy,
						which also governs your use of the Service, to understand our
						practices regarding the collection and use of your personal
						information.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
					<p>
						You agree not to use the Service for any unlawful purpose or in any
						way that could damage, disable, overburden, or impair the Service.
						You may not attempt to gain unauthorized access to any part of the
						Service.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						6. Intellectual Property
					</h2>
					<p>
						The Service and its original content, features, and functionality
						are and will remain the exclusive property of Tallyo and its
						licensors. The Service is protected by copyright, trademark, and
						other laws.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						7. Disclaimer of Warranties
					</h2>
					<p>
						The Service is provided on an "as is" and "as available" basis. We
						make no representations or warranties of any kind, express or
						implied, as to the operation of the Service or the information,
						content, materials, or products included therein.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						8. Limitation of Liability
					</h2>
					<p>
						In no event shall Tallyo be liable for any indirect, incidental,
						special, consequential, or punitive damages, including without
						limitation, loss of profits, data, use, goodwill, or other
						intangible losses.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
					<p>
						We may terminate or suspend your account and bar access to the
						Service immediately, without prior notice or liability, under our
						sole discretion, for any reason whatsoever and without limitation.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
					<p>
						We reserve the right to modify or replace these Terms at any time.
						If a revision is material, we will provide at least 30 days notice
						prior to any new terms taking effect.
					</p>
				</section>

				<section>
					<h2 className="text-2xl font-semibold mb-4">
						11. Contact Information
					</h2>
					<p>
						If you have any questions about these Terms of Service, please
						contact us through the appropriate channels provided in the
						application.
					</p>
				</section>

				<div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
					<p>Last updated: {new Date().toLocaleDateString()}</p>
				</div>
			</div>
		</div>
	);
}
