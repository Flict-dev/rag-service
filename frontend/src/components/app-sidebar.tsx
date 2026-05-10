import * as React from "react"
import { GalleryVerticalEndIcon, PlusIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export type DocsSidebarGroup = {
  items: {
    id: string
    isActive: boolean
    title: string
  }[]
  title: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  canCreate: boolean
  groups: DocsSidebarGroup[]
  onCreateFolder: () => void
  onCreatePage: (group: string) => void
  onSelectArticle: (articleId: string) => void
}

export function AppSidebar({
  canCreate,
  groups,
  onCreateFolder,
  onCreatePage,
  onSelectArticle,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/docs">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEndIcon />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Documentation</span>
                  <span>v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
            {canCreate ? (
              <SidebarMenuAction
                aria-label="Create folder"
                onClick={onCreateFolder}
                title="Create folder"
              >
                <PlusIcon />
              </SidebarMenuAction>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {groups.map((group) => (
              <SidebarMenuItem key={group.title}>
                <SidebarMenuButton className="font-medium" type="button">
                  {group.title}
                </SidebarMenuButton>
                {canCreate ? (
                  <SidebarMenuAction
                    aria-label={`Create page in ${group.title}`}
                    onClick={() => onCreatePage(group.title)}
                    title="Create page"
                  >
                    <PlusIcon />
                  </SidebarMenuAction>
                ) : null}
                {group.items.length > 0 ? (
                  <SidebarMenuSub>
                    {group.items.map((item) => (
                      <SidebarMenuSubItem key={item.id}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <a
                            href={`/docs/${item.id}`}
                            onClick={(event) => {
                              event.preventDefault()
                              onSelectArticle(item.id)
                            }}
                          >
                            {item.title}
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton aria-disabled="true" className="text-sidebar-foreground/45">
                        Empty
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
