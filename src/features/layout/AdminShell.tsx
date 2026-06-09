import * as React from "react";

export interface AdminShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AdminShell: React.FC<AdminShellProps> = ({ className, children, ...props }) => {
  // TODO: Implement AdminShell layout logic
  return (
    <div className={className} {...props}>
      {/* Layout components like Navbar, SidebarAdmin could go here */}
      <main>{children}</main>
    </div>
  );
};
