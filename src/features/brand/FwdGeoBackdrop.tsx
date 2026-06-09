import * as React from "react";

export interface FwdGeoBackdropProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FwdGeoBackdrop: React.FC<FwdGeoBackdropProps> = ({ className, ...props }) => {
  // TODO: Implement FwdGeoBackdrop logic and styling
  return (
    <div className={className} {...props}>
      {props.children}
    </div>
  );
};
