import * as React from "react";

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {}

export const Navbar: React.FC<NavbarProps> = ({ className, ...props }) => {
  // TODO: Implement Navbar logic and styling
  return (
    <nav className={className} {...props}>
      {props.children}
    </nav>
  );
};
