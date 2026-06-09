import * as React from "react";

export interface JuniorShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export const JuniorShell: React.FC<JuniorShellProps> = ({ className, children, ...props }) => {
  // TODO: Implement JuniorShell layout logic
  return (
    <div className={className} {...props}>
      {/* Layout components like Navbar, Sidebar could go here */}
      <main>{children}</main>
    </div>
  );
};
