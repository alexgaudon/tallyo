import {
  Apple,
  Baby,
  Banknote,
  Beer,
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
  Building,
  Bus,
  Calendar,
  Camera,
  Car,
  Check,
  ChevronsUpDown,
  Coffee,
  CreditCard,
  DollarSign,
  Dumbbell,
  FileText,
  Folder,
  Fuel,
  Gamepad2 as Gamepad,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Hotel,
  Laptop,
  MessageSquare,
  Music,
  Pizza,
  Plane,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Train,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ICONS = {
  Home,
  Calendar,
  Car,
  Fuel,
  Tag,
  ShoppingCart,
  Wallet,
  Banknote,
  DollarSign,
  CreditCard,
  Users,
  Settings,
  Star,
  Heart,
  Bookmark,
  Bell,
  MessageSquare,
  FileText,
  Folder,
  Apple,
  Baby,
  Beer,
  BookOpen,
  Briefcase,
  Building,
  Bus,
  Camera,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  Hotel,
  Laptop,
  Music,
  Pizza,
  Plane,
  Train,
  Wifi,
  Gamepad,
} as const;

interface IconPickerProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function IconPicker({
  value,
  onValueChange = () => {},
  placeholder = "Select an icon",
  className,
  disabled = false,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedIcon = value
    ? Object.entries(ICONS).find(([name]) => name === value)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedIcon ? (
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = selectedIcon[1];
                return <Icon className="h-4 w-4" />;
              })()}
              <span>{selectedIcon[0]}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command className="overflow-visible">
          <CommandInput placeholder="Search icons..." />
          <div
            className="max-h-[400px] overflow-y-auto"
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            <CommandList className="scroll-py-0">
              <CommandEmpty>No icon found.</CommandEmpty>
              <CommandGroup className="!overflow-visible !p-1">
                {Object.entries(ICONS).map(([name, Icon]) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={(currentValue) => {
                      onValueChange?.(currentValue);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{name}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === name ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
