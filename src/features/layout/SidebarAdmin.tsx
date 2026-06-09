import * as React from "react";

export interface SidebarAdminProps extends React.HTMLAttributes<HTMLElement> {}

export const SidebarAdmin: React.FC<SidebarAdminProps> = ({ className, ...props }) => {
  // TODO: Implement SidebarAdmin logic and styling
  return (
    <aside className={className} {...props}>
      {props.children}
    </aside>
  );
};
