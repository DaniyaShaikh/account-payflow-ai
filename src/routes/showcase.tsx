import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/payflow-ui";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  Settings, 
  Bell, 
  Search, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";

export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

function Showcase() {
  return (
    <>
      <PageHeader 
        title="Navigation & UI Showcase" 
        description="A demonstration of the application's design system and navigation components." 
      />

      <div className="grid gap-6">
        <Panel title="Buttons & Actions" description="Standard button variants used throughout the platform.">
          <div className="flex flex-wrap gap-4">
            <Button>Default Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button size="sm"><Plus className="mr-2 size-4" /> New Item</Button>
            <Button><Settings className="mr-2 size-4" /> Settings</Button>
            <Button size="lg">Large Action</Button>
            <Button size="icon" variant="outline"><Bell className="size-4" /></Button>
            <Button size="icon" variant="ghost"><Search className="size-4" /></Button>
          </div>
        </Panel>

        <Panel title="Tooltips" description="Contextual information displayed on hover.">
          <div className="flex flex-wrap gap-8">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Info className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a helpful tooltip message.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-sm font-medium text-primary underline decoration-dotted underline-offset-4">
                    Hover for details
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Tooltips can appear on any side.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Panel>

        <Panel title="Navigation Patterns" description="Common link and navigation styles.">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <LayoutDashboard className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dashboard Overview</p>
                  <p className="text-xs text-muted-foreground">View key metrics and active cases.</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="flex items-center gap-1 text-primary hover:underline">
                Documentation <ExternalLink className="size-3" />
              </a>
              <span className="text-muted-foreground">|</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                Help Center
              </a>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
