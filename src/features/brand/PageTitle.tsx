import * as React from "react";

export interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { title: string; subtitle?: string; }

export const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, className, ...props }) => {
  // TODO: Implement PageTitle logic and styling
  return (
    <div className={className} {...props}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
};
