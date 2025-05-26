import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/authClient";

import icon from "@/favicon.ico?url";
import { AuthRepository } from "@/repositories/auth";
import { MetaRepository } from "@/repositories/meta";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ModeToggle } from "./mode-toggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  const authQuery = useSuspenseQuery(AuthRepository.getUserAuthQuery());

  return (
    <nav className="border-b">
      <div className="flex justify-between items-center px-4 lg:px-8 py-3">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img src={icon} alt={`Tallyo logo`} className="rounded-lg w-8 h-8" />
            <span className="font-bold text-xl">Tallyo</span>
          </Link>
        </div>
        <div className="hidden lg:flex lg:items-center lg:space-x-6">
          {authQuery.data.isAuthenticated ? (
            <>
              <NavLinks />
              <div className="flex space-x-2">
                <ModeToggle />
                <UserDropdown />
              </div>
            </>
          ) : (
            <>
              <ModeToggle />
              <Button type="button" asChild className="w-fit" size="lg">
                <Link to="/signin">Sign in</Link>
              </Button>
            </>
          )}
        </div>
        <div className="lg:hidden flex space-x-2">
          <ModeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-6 h-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col space-y-4 mt-4">
                {authQuery.data.isAuthenticated ? (
                  <>
                    <NavLinks asChild />
                    <UserDropdown />
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button type="button" asChild className="mx-auto w-fit" size="lg">
                        <Link to="/signin">Sign in</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

function NavLinks({ asChild }: { asChild?: boolean }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/categories", label: "Categories" },
    {
      href: "/transactions",
      label: "Transactions",
    },
    { href: "/import", label: "Import" },
  ];

  const linkElements = links.map((link) => (
    <Link key={link.href} to={link.href} className="font-medium text-foreground hover:text-gray-400 text-sm">
      {link.label}
    </Link>
  ));

  if (asChild) {
    return linkElements.map((x) => (
      <SheetClose key={x.key} asChild>
        {x}
      </SheetClose>
    ));
  }

  return linkElements;
}

function UserDropdown() {
  const authQuery = useSuspenseQuery(AuthRepository.getUserAuthQuery());

  const { data: meta } = useQuery(MetaRepository.getUserMeta());
  const { mutate: updateMeta } = MetaRepository.useUpdateUserMetaMutation();

  const onToggleDeveloperMode = () => {
    updateMeta({
      privacyMode: meta?.settings?.privacyMode ?? false,
      developerMode: !meta?.settings?.developerMode,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-1">
            <Avatar className="w-5 h-5">
              {authQuery.data?.user?.image ? (
                <img src={authQuery.data.user.image} alt={authQuery.data.user.name} />
              ) : (
                <AvatarFallback>{authQuery.data?.user?.name.substring(0, 1).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <span className="font-medium text-sm">{authQuery.data?.user?.name || ""}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onToggleDeveloperMode}>
            <span>{meta?.settings?.developerMode ? "Disable" : "Enable"} Developer Mode</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              authClient.signOut().then(() => {
                window.location.reload();
                window.location.href = "/";
              });
            }}
          >
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
