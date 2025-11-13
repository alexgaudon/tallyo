import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

export interface PaginationInfo {
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

interface PaginatorProps {
	pagination: PaginationInfo;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	className?: string;
	isLoading?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Paginator({
	pagination,
	onPageChange,
	onPageSizeChange,
	className = "",
	isLoading = false,
}: PaginatorProps) {
	const queryClient = useQueryClient();

	if (pagination.totalPages <= 1) return null;

	const prefetchPage = (page: number) => {
		if (page >= 1 && page <= pagination.totalPages) {
			queryClient.prefetchQuery(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page, pageSize: pagination.pageSize },
				}),
			);
		}
	};

	return (
		<div className={`flex items-center justify-between px-2 py-4 ${className}`}>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
						onMouseEnter={() => prefetchPage(pagination.page - 1)}
						disabled={pagination.page === 1 || isLoading}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm text-muted-foreground">
						Page {pagination.page} of {pagination.totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							onPageChange(Math.min(pagination.totalPages, pagination.page + 1))
						}
						onMouseEnter={() => prefetchPage(pagination.page + 1)}
						disabled={pagination.page === pagination.totalPages || isLoading}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
				<Select
					value={pagination.pageSize.toString()}
					onValueChange={(value) => {
						const newPageSize = Number.parseInt(value, 10);
						// Save to localStorage
						try {
							localStorage.setItem("tallyo.preferredPageSize", value);
						} catch {
							// If localStorage fails, continue anyway
						}
						onPageSizeChange(newPageSize);
					}}
					disabled={isLoading}
				>
					<SelectTrigger className="h-8 w-[70px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<SelectItem key={size} value={size.toString()}>
								{size}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="text-sm text-muted-foreground">
				{pagination.total} total items
			</div>
		</div>
	);
}
