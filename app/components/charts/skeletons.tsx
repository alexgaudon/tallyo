import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  PiggyBankIcon,
} from "lucide-react";

export function ChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <Skeleton className="w-3/4 h-6" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="w-1/2 h-4" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full h-[300px]" />
      </CardContent>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div className="gap-4 grid md:grid-cols-1 lg:grid-cols-2">
      {[
        { title: "Total Transactions", icon: CreditCardIcon },
        { title: "Total Income", icon: ArrowUpIcon },
        { title: "Total Expenses", icon: ArrowDownIcon },
        { title: "Savings Rate", icon: PiggyBankIcon },
      ].map((item, index) => (
        <Card key={index}>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-bold text-2xl">
              <CardTitle className="flex items-center gap-x-2 font-medium text-sm">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <Skeleton className="w-[80px] h-5" />
              </CardTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 w-[100px] h-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TopVendorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Vendors (5)</CardTitle>
        <CardDescription>
          <Skeleton className="w-1/2 h-4" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Transaction Count</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index} className="animate-pulse">
                <TableCell>
                  <Skeleton className="rounded w-3/4 h-4"></Skeleton>
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto rounded w-1/2 h-4"></Skeleton>
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto rounded w-2/3 h-4"></Skeleton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
