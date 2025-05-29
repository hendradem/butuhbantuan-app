import React from "react";
import { Button } from "../ui/Button";
import Icon from "../ui/Icon";
import ServiceNotFound from "./ServiceNotFound";
import ServiceFound from "./ServiceFound";
import ServiceLoading from "./ServiceLoading";

interface ServiceLoadingProps {
  currentUserRegency: string;
  isLoading: boolean;
  isServiceIsAvailable: boolean;
}

function GettingService({
  currentUserRegency,
  isLoading,
  isServiceIsAvailable,
}: ServiceLoadingProps) {
  return (
    <div>
      <div>
        {!isLoading && !isServiceIsAvailable && (
          <ServiceNotFound currentUserRegency={currentUserRegency} />
        )}
      </div>
      <div>
        {!isLoading && isServiceIsAvailable && (
          <ServiceFound currentUserRegency={currentUserRegency} />
        )}
      </div>
      <div>
        {isLoading && (
          <ServiceLoading currentUserRegency={currentUserRegency} />
        )}
      </div>
    </div>
  );
}

export default GettingService;
