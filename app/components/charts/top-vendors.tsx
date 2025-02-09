import { displayFormatMonth } from "@/lib/utils";
import { ChartsRespository } from "@/repositories/charts";
import { useQuery } from "@tanstack/react-query";
import { usePrivacyMode } from "../toggle-privacy-mode";
import AmountDisplay from "../transactions/amount-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import TopVendorSkeleton from "./skeletons";

export function TopVendors(props: { from: Date; to: Date }) {
  const { isPrivacyMode } = usePrivacyMode();

  const { data, isLoading } = useQuery(
    ChartsRespository.getTopVendorsDataQuery({
      from: props.from,
      to: props.to,
    }),
  );

  if (isLoading) {
    return <TopVendorSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Vendors (5)</CardTitle>
        <CardDescription>
          {props.from &&
            props.to &&
            `${displayFormatMonth(props.from)} - ${displayFormatMonth(props.to)}`}
          {!props.from && !props.to && "Past 12 Months"}
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
            {data?.slice(0, 5).map((vendor, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {isPrivacyMode ? "••••••••••" : vendor.displayVendor}
                </TableCell>
                <TableCell className="text-right">
                  {isPrivacyMode ? "•••" : vendor.transactionCount}
                </TableCell>
                <TableCell className="text-right">
                  <AmountDisplay amount={vendor.totalAmount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
