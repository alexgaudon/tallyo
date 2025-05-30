import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PencilIcon, StoreIcon, TagIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import { EditMerchantForm } from "./edit-merchant-form";

interface MerchantCardProps {
	merchant: MerchantWithKeywordsAndCategory;
	onDelete: (id: string) => Promise<void>;
}

export function MerchantCard({ merchant, onDelete }: MerchantCardProps) {
	const [editOpen, setEditOpen] = useState(false);

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<StoreIcon className="h-4 w-4 text-muted-foreground" />
						<span className="font-medium">{merchant.name}</span>
						{merchant.recommendedCategory && (
							<span className="ml-2 text-xs text-muted-foreground">
								({merchant.recommendedCategory.name})
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						<Dialog open={editOpen} onOpenChange={setEditOpen}>
							<DialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-muted-foreground hover:text-primary"
								>
									<PencilIcon className="h-4 w-4" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2 text-lg">
										<PencilIcon className="h-4 w-4" />
										Edit Merchant
									</DialogTitle>
								</DialogHeader>
								<EditMerchantForm
									merchant={merchant}
									callback={() => setEditOpen(false)}
								/>
							</DialogContent>
						</Dialog>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-muted-foreground hover:text-destructive"
								>
									<XIcon className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Merchant</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this merchant? This action
										cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => onDelete(merchant.id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
				{merchant.keywords?.keywords && (
					<div className="mt-2 flex flex-wrap gap-1">
						{merchant.keywords.keywords.split(",").map((keyword: string) => (
							<span
								key={keyword}
								className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
							>
								<TagIcon className="h-3 w-3" />
								{keyword.trim()}
							</span>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
