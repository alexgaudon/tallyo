import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  ChevronUp,
  CreditCardIcon,
  FolderTreeIcon,
  LogOut,
  Settings,
  StoreIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export function AppSidebar() {
  const { data: session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const hasUnreviewedTransactions =
    (session?.meta?.unreviewedTransactionCount ?? 0) > 0;
  const unreviewedTransactionCount =
    session?.meta?.unreviewedTransactionCount ?? 0;

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
    { to: "/merchants", label: "Merchants", icon: StoreIcon },
    { to: "/categories", label: "Categories", icon: FolderTreeIcon },
    {
      to: hasUnreviewedTransactions
        ? "/transactions?onlyUnreviewed=true"
        : "/transactions",
      label: `Transactions${
        hasUnreviewedTransactions ? ` (${unreviewedTransactionCount})` : ""
      }`,
      icon: CreditCardIcon,
    },
    { to: "/reports", label: "Reports", icon: BarChart3Icon },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={handleNavigation}>
                <div className="flex aspect-square size-8 items-center justify-center">
                  <img
                    src="/favicon.ico"
                    alt="Tallyo logo"
                    className="size-4 rounded"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Tallyo</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Personal Finance
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === link.to}
                    tooltip={link.label}
                  >
                    <Link to={link.to} onClick={handleNavigation}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip="Account"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {session?.user?.image ? (
                      <img
                        alt={session.user.name ?? ""}
                        src={session.user.image}
                      />
                    ) : (
                      <AvatarFallback className="rounded-lg">
                        {session?.user?.name?.substring(0, 1).toUpperCase() ??
                          ""}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user.name ?? ""}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user.email ?? ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2"
                    onClick={handleNavigation}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    queryClient.invalidateQueries({
                      queryKey: ["session"],
                    });
                    setTimeout(() => {
                      navigate({ to: "/" });
                    }, 500);
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
