import React from "react";
import { Button } from "../ui/Button";
import Icon from "../ui/Icon";
import ServiceNotFound from "./ServiceNotFound";
import ServiceFound from "./ServiceFound";
import ServiceLoading from "./ServiceLoading";

interface ServiceLoadingProps {
  currentUserRegency: string;
  isServiceIsAvailable: boolean;
}

function GettingService({
  currentUserRegency,
  isServiceIsAvailable,
}: ServiceLoadingProps) {
  console.log("apakah ada", isServiceIsAvailable);
  return (
    <div>
      <div>
        {!isServiceIsAvailable && (
          <ServiceNotFound currentUserRegency={currentUserRegency} />
        )}
      </div>
      <div>
        {isServiceIsAvailable && (
          <ServiceFound currentUserRegency={currentUserRegency} />
        )}
      </div>
    </div>
  );
}

export default GettingService;
