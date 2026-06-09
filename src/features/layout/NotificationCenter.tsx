import * as React from "react";

export interface NotificationCenterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className, ...props }) => {
  // TODO: Implement NotificationCenter logic and styling
  return (
    <div className={className} {...props}>
      {props.children}
    </div>
  );
};
