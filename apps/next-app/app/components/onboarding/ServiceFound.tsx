import React from "react";
import { Button } from "../ui/Button";
import Link from "next/link";
import Icon from "../ui/Icon";

interface ServiceNotFoundProps {
  currentUserRegency: string;
}

const ServiceFound = ({ currentUserRegency }: ServiceNotFoundProps) => {
  return (
    <div>
      <div className="grid gap-4 w-60">
        <div>
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full shadow-sm justify-center items-center inline-flex">
            <Icon
              name="mynaui:chat-check-solid"
              className="text-blue-500 text-[40px]"
            />
          </div>
        </div>

        <div>
          <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
            Siap untuk digunakan
          </h2>
          <p className="text-center text-black text-sm font-normal leading-snug pb-4">
            Layanan kami tersedia untuk {currentUserRegency}. Klik tombol di
            bawah ini untuk mulai
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/emergency">
              <Button size="md" variant="black" className="rounded-full">
                Buka Layanan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceFound;
