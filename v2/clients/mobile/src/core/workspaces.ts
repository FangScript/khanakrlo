export const workspaces = [
  { role:"customer",title:"Customer",description:"Your meals, addresses and orders" },
  { role:"merchant",title:"Restaurant",description:"Your menu and kitchen orders" },
  { role:"rider",title:"Rider",description:"Your deliveries and cash balance" },
] as const;
export type WorkspaceRole = typeof workspaces[number]["role"];
export function authorizedWorkspaces(roles:readonly string[]) { return workspaces.filter((workspace)=>roles.includes(workspace.role)); }
