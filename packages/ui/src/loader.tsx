import React from "react";

interface SkeletonLoaderProps {
  children: React.ReactNode;
}

const SkeletonLoader = ({ children }: SkeletonLoaderProps) => {
  return <div className="animate-pulse">{children}</div>;
};

export default SkeletonLoader;
