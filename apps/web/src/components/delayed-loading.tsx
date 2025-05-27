import * as React from "react";

interface DelayedLoadingProps {
	children: React.ReactNode;
	isLoading: boolean;
	delay?: number;
}

export function DelayedLoading({
	children,
	isLoading,
	delay = 300,
}: DelayedLoadingProps) {
	const [showLoading, setShowLoading] = React.useState(false);

	React.useEffect(() => {
		if (!isLoading) {
			setShowLoading(false);
			return;
		}

		const timer = setTimeout(() => {
			setShowLoading(true);
		}, delay);

		return () => clearTimeout(timer);
	}, [isLoading, delay]);

	if (!isLoading) {
		return <>{children}</>;
	}

	if (!showLoading) {
		return null;
	}

	return <>{children}</>;
}
