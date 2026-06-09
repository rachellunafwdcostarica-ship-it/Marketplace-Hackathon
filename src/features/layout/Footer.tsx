import * as React from "react";

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

export const Footer: React.FC<FooterProps> = ({ className, ...props }) => {
  // TODO: Implement Footer logic and styling
  return (
    <footer className={className} {...props}>
      {props.children}
    </footer>
  );
};
