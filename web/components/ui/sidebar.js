'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button.js';

const SidebarContext = createContext(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

function SidebarProvider({ defaultOpen = true, className, style, children, ...props }) {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const state = open ? 'expanded' : 'collapsed';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        if (isMobile) setOpenMobile((current) => !current);
        else setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  function toggleSidebar() {
    if (isMobile) setOpenMobile((current) => !current);
    else {
      setOpen((current) => {
        document.cookie = `sidebar_state=${!current}; path=/; max-age=${60 * 60 * 24 * 7}`;
        return !current;
      });
    }
  }

  return (
    <SidebarContext.Provider value={{ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }}>
      <TooltipPrimitive.Provider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3rem', ...style }}
          className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)}
          {...props}
        >
          {children}
        </div>
      </TooltipPrimitive.Provider>
    </SidebarContext.Provider>
  );
}

function Sidebar({ side = 'left', collapsible = 'offcanvas', className, children, ...props }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div data-slot="sidebar" className={cn('flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground', className)} {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <DialogPrimitive.Root open={openMobile} onOpenChange={setOpenMobile}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
          <DialogPrimitive.Content
            data-slot="sidebar"
            data-sidebar="sidebar"
            data-mobile="true"
            className={cn('fixed inset-y-0 z-50 flex h-svh w-[18rem] flex-col bg-sidebar p-0 text-sidebar-foreground shadow-lg outline-none transition-transform duration-200', side === 'left' ? 'left-0 border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0' : 'right-0 border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0', className)}
          >
            <DialogPrimitive.Title className="sr-only">Main navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Navigate the application.</DialogPrimitive.Description>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          side === 'left' ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]' : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className,
        )}
        {...props}
      >
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className="flex h-full w-full flex-col bg-sidebar">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label="Toggle sidebar"
      className={cn('size-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
    </Button>
  );
}

function SidebarRail({ className, ...props }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      title="Toggle sidebar"
      onClick={toggleSidebar}
      className={cn('absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-sidebar-border md:flex', className)}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }) {
  return <main data-slot="sidebar-inset" className={cn('relative flex min-w-0 flex-1 flex-col bg-background', className)} {...props} />;
}

function SidebarHeader({ className, ...props }) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarFooter({ className, ...props }) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarContent({ className, ...props }) {
  return <div data-slot="sidebar-content" data-sidebar="content" className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden', className)} {...props} />;
}

function SidebarGroup({ className, ...props }) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }) {
  return <div data-slot="sidebar-group-label" data-sidebar="group-label" className={cn('flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0', className)} {...props} />;
}

function SidebarGroupContent({ className, ...props }) {
  return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={cn('w-full text-sm', className)} {...props} />;
}

function SidebarMenu({ className, ...props }) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn('group/menu-item relative', className)} {...props} />;
}

function SidebarMenuSub({ className, ...props }) {
  return <ul data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={cn('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden', className)} {...props} />;
}

function SidebarMenuSubItem({ className, ...props }) {
  return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn('group/menu-sub-item relative', className)} {...props} />;
}

function SidebarMenuSubButton({ asChild = false, isActive = false, className, ...props }) {
  const Component = asChild ? Slot : 'a';
  return (
    <Component
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-active={isActive}
      className={cn('flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'text-sidebar-foreground',
        outline: 'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function SidebarMenuButton({ asChild = false, isActive = false, variant, size, tooltip, className, ...props }) {
  const { isMobile, state } = useSidebar();
  const Component = asChild ? Slot : 'button';
  const button = (
    <Component
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size || 'default'}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
      {...props}
    />
  );

  if (!tooltip) return button;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side="right" align="center" hidden={state !== 'collapsed' || isMobile} className="z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
          {tooltip}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
