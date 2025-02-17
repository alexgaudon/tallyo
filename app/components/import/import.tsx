import { formatDateISO8601 } from "@/lib/utils";
import { CategoryRepository } from "@/repositories/categories";
import { TransactionRepository } from "@/repositories/transactions";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, File, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/button";

interface ImportTransaction {
  DTPOSTED: string;
  TRNAMT: string;
  FITID: string;
  NAME: string;
}

const parseQFX = (data: string): ImportTransaction[] => {
  const statements = data.split("<STMTTRN>");

  const transactions: string[] = [];

  const transactionData: ImportTransaction[] = [];

  for (let i = 1; i < statements.length; i++) {
    const stmt = statements[i];

    const parts = stmt.split("</STMTTRN");
    if (parts.length > 1) {
      transactions.push(parts[0].replaceAll("\n", ""));
    }
  }

  for (const line of transactions) {
    const parts = line.split("<").filter((x) => x.trim() !== "");
    const temp: Partial<ImportTransaction> = {};
    for (const part of parts) {
      const [type, value] = part.split(">");
      if (type === "DTPOSTED") {
        const date = value.substring(0, 8).split("");
        date.splice(4, 0, "-");
        date.splice(7, 0, "-");
        temp[type] = date.join("");
      } else if (type in temp) {
        temp[type as keyof ImportTransaction] = value;
      }
    }

    if (temp.DTPOSTED && temp.TRNAMT && temp.FITID && temp.NAME) {
      transactionData.push(temp as ImportTransaction);
    }
  }

  return transactionData;
};

export default function QFXFileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [qfxData, setQfxData] = useState<ImportTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recommendedCategories, setRecommendedCategories] = useState<
    Record<string, string>
  >({});

  const { data: categories } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery(),
  );

  const { mutateAsync } =
    TransactionRepository.useCreateUserTransactionMutation();
  const { mutateAsync: recommendCategory } =
    TransactionRepository.useSetRecommendedTransactionCategoryMutation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError(null);
    setQfxData([]);

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onabort = () => setError("File reading was aborted");
      reader.onerror = () => setError("File reading has failed");
      reader.onload = () => {
        try {
          const result = parseQFX(reader.result as string);
          if (result.length > 0) {
            setQfxData(result);
          } else {
            setError("No valid transactions found in the QFX file");
          }
        } catch (err) {
          console.error(err);
          setError("Error parsing QFX file");
        }
      };
      reader.readAsText(file);
    });
  }, []);

  useEffect(() => {
    const fetchRecommendedCategories = async () => {
      const recommendations = await Promise.all(
        qfxData.map(async (transaction) => {
          const category = await recommendCategory({
            vendor: transaction.NAME,
          });
          return {
            fitid: transaction.FITID,
            category: category ?? "Uncategorized",
          };
        }),
      );

      const categoryMap = recommendations.reduce<Record<string, string>>(
        (map, { fitid, category }) => {
          map[fitid] = category;
          return map;
        },
        {},
      );

      setRecommendedCategories(categoryMap);
    };

    if (qfxData.length > 0) {
      fetchRecommendedCategories();
    }
  }, [qfxData, recommendCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-ofx": [".qfx", ".ofx"],
    },
    multiple: false,
  });

  return (
    <div className="p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto w-12 h-12 text-gray-400" />
        {isDragActive ? (
          <p className="mt-2 text-gray-600 text-sm">
            Drop the QFX file here ...
          </p>
        ) : (
          <p className="mt-2 text-gray-600 text-sm">
            Drag 'n' drop a QFX file here, or click to select a file
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center bg-red-100 mt-4 p-4 rounded-lg text-red-700">
          <AlertCircle className="mr-2 w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 font-semibold text-lg">Accepted file:</h4>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center text-sm text-white"
              >
                <File className="mr-2 w-4 h-4" />
                {file.name} - {file.size} bytes
              </li>
            ))}
          </ul>
        </div>
      )}

      {qfxData.length > 0 && (
        <div>
          <h1>{qfxData.length} transactions found</h1>
          <Button
            onClick={async () => {
              const results = [];
              for (const transaction of qfxData) {
                results.push(
                  await mutateAsync({
                    amount: Number(transaction.TRNAMT) * 100,
                    date: formatDateISO8601(new Date(transaction.DTPOSTED)),
                    vendor: transaction.NAME,
                    categoryId: recommendedCategories[transaction.FITID],
                    externalId: transaction.FITID,
                  }),
                );
              }

              alert(`Imported ${results.length} transactions.`);
            }}
          >
            Import
          </Button>
        </div>
      )}

      {qfxData.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <h4 className="mb-4 font-semibold text-lg">QFX Contents:</h4>
          <table className="divide-y divide-gray-200 min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 font-medium text-left text-white text-xs uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 font-medium text-left text-white text-xs uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 font-medium text-left text-white text-xs uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 font-medium text-left text-white text-xs uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 font-medium text-left text-white text-xs uppercase tracking-wider">
                  Recommended Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {qfxData.map((transaction) => (
                <tr key={transaction.FITID}>
                  <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                    {transaction.DTPOSTED}
                  </td>
                  <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                    {transaction.TRNAMT}
                  </td>
                  <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                    {transaction.NAME}
                  </td>
                  <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                    {transaction.FITID}
                  </td>
                  <td className="px-6 py-4 text-sm text-white whitespace-nowrap">
                    {categories?.find(
                      (x) => x.id === recommendedCategories[transaction.FITID],
                    )?.name || "Loading..."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
