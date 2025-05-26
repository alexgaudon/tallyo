import { Button } from "@/components/ui/button";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { BarChart3, MergeIcon, PieChart, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  beforeLoad: async (ctx) => {
    if (ctx.context.auth.isAuthenticated) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
});

function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32 xl:py-48 w-full">
          <div className="px-4 md:px-6 container">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl/none tracking-tighter">
                  Measure. Understand. Improve.
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Tallyo helps you gain insights into your personal finances so you can make better financial decisions.
                </p>
              </div>
              <div className="space-x-4">
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    navigate({
                      to: "/signin",
                    });
                  }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="bg-gray-100 dark:bg-gray-800 py-12 md:py-24 lg:py-32 w-full">
          <div className="px-4 md:px-6 container">
            <h2 className="mb-8 font-bold text-3xl text-center sm:text-4xl md:text-5xl tracking-tighter">Features</h2>
            <div className="gap-10 grid sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-3 text-center">
                <Upload className="w-12 h-12 text-primary" />
                <h3 className="font-bold text-xl">Transaction Logging</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Easily upload transactions from any financial provider via API.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 text-center">
                <BarChart3 className="w-12 h-12 text-primary" />
                <h3 className="font-bold text-xl">Categorization</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Automatically categorize transactions for streamlined analysis.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 text-center">
                <MergeIcon className="w-12 h-12 text-primary" />
                <h3 className="font-bold text-xl">Vendor Normalization</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Normalizes vendors to a single entity for better analysis.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 text-center">
                <PieChart className="w-12 h-12 text-primary" />
                <h3 className="font-bold text-xl">Insights & Charts</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Visualize your finances with intuitive charts and key stats.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="charts" className="py-12 md:py-24 lg:py-32 w-full">
          <div className="px-4 md:px-6 container">
            <div className="flex flex-col justify-center items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="font-bold text-3xl sm:text-4xl md:text-5xl tracking-tighter">Charts</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Gain actionable insights through the following:
                </p>
              </div>
            </div>
            <div className="items-center gap-6 lg:gap-12 grid lg:grid-cols-2 mx-auto py-12 max-w-5xl">
              <div className="flex flex-col justify-center space-y-4">
                <ul className="gap-6 grid">
                  <li>
                    <div className="gap-1 grid">
                      <h3 className="font-bold text-xl">Monthly Expenses</h3>
                    </div>
                  </li>
                  <li>
                    <div className="gap-1 grid">
                      <h3 className="font-bold text-xl">Income vs Expenses</h3>
                    </div>
                  </li>
                  <li>
                    <div className="gap-1 grid">
                      <h3 className="font-bold text-xl">Transaction Category Breakdown</h3>
                    </div>
                  </li>
                  <li>
                    <div className="gap-1 grid">
                      <h3 className="font-bold text-xl">&quot;Stats for Nerds&quot;</h3>
                      <p className="text-gray-500 text-sm dark:text-gray-400">
                        Track transaction count, income, expenses, and savings rate
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex sm:flex-row flex-col items-center gap-2 px-4 md:px-6 py-6 border-t w-full shrink-0">
        <p className="text-gray-500 text-xs dark:text-gray-400">
          © {new Date().getFullYear()} Tallyo. All rights reserved.
        </p>
        <nav className="flex gap-4 sm:gap-6 sm:ml-auto">
          <Link className="text-xs underline-offset-4 hover:underline" to="/tos">
            Terms of Service
          </Link>
          <Link className="text-xs underline-offset-4 hover:underline" to="/privacy">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
