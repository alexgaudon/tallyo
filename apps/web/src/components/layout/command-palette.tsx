import { useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Plus } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { signOut } from "@/lib/auth-client";
import { allNavItems } from "@/lib/nav";
import { queryClient } from "@/utils/orpc";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Navigate, create, and change settings"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {allNavItems.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.to}`}
              onSelect={() => run(() => navigate({ to: item.to }))}
            >
              <item.icon />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="create new transaction"
            onSelect={() =>
              run(() =>
                navigate({
                  to: "/transactions",
                  search: { create: true },
                }),
              )
            }
          >
            <Plus />
            <span>Create transaction</span>
          </CommandItem>
          <CommandItem
            value="toggle theme appearance dark light"
            onSelect={() =>
              run(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            <Moon />
            <span>Toggle theme</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Session">
          <CommandItem
            value="sign out log out"
            onSelect={() =>
              run(async () => {
                await signOut();
                queryClient.invalidateQueries({ queryKey: ["session"] });
                navigate({ to: "/" });
              })
            }
          >
            <LogOut />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
