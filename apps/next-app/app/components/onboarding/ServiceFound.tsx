import React from "react";
import EmptyImage from "../ui/EmptyImage";
import { Button } from "../ui/Button";

interface ServiceNotFoundProps {
  currentUserRegency: string;
}

const ServiceFound = ({ currentUserRegency }: ServiceNotFoundProps) => {
  return (
    <div>
      <div className="grid gap-4 w-60">
        <EmptyImage />
        <div>
          <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
            Layanan belum tersedia
          </h2>
          <p className="text-center text-black text-sm font-normal leading-snug pb-4">
            Layanan kami belum tersedia untuk daerah {currentUserRegency}
          </p>
          <div className="flex flex-col gap-2">
            <Button size="md" className="rounded-full bg-indigo-600">
              Jadi Kontributor
            </Button>
            <Button size="md" variant="black" className="rounded-full">
              Layanan Emergency
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceFound;
