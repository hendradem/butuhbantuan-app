import React, { useState, useCallback } from "react";
import Link from "next/link";
import useBottomSheet from "@/app/hooks/useBottomSheet";
import BottomSheetMain from "../bottomsheet/Bottomsheet";
import { FaBriefcaseMedical, FaCarOn, FaFire } from "react-icons/fa6";

const BottomMenu = () => {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState("");
  const bottomSheet = useBottomSheet();
  const onToggle = useCallback(() => {
    bottomSheet.onClose();
    bottomSheet.onOpen();
  }, [bottomSheet]);

  const onEmergencyButtonTypeClick = (type: string): void => {
    setSelectedEmergencyType(type);
  };

  return (
    <div>
      <div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div
            onClick={() => {
              onEmergencyButtonTypeClick("ambulance");
            }}
            className={`${
              selectedEmergencyType == "ambulance"
                ? "border-orange-100"
                : "border-gray-50"
            } flex flex-col items-center w-full h-auto p-4 border  bg-white rounded-lg shadow-sm cursor-pointer transition `}
          >
            <div className="rounded-full p-3 bg-red-50">
              <FaBriefcaseMedical className="text-red-400 text-xl" />
            </div>
            <div className="text-center">
              <h2 className="mt-2 font-medium text-gray-700 text-md">
                Ambulance
              </h2>
            </div>
          </div>
          <div
            onClick={() => {
              onEmergencyButtonTypeClick("pemadam");
            }}
            className={`${
              selectedEmergencyType == "pemadam"
                ? "border-orange-100"
                : "border-gray-50"
            } flex flex-col items-center w-full h-auto p-4 border  bg-white rounded-lg shadow-sm cursor-pointer transition`}
          >
            <div className="rounded-full p-3 bg-red-50">
              <FaFire className="text-red-400 text-xl" />
            </div>
            <div className="text-center">
              <h2 className="mt-2 font-medium text-gray-700 text-md">
                Pemadam
              </h2>
            </div>
          </div>
          <div
            onClick={() => {
              onEmergencyButtonTypeClick("polisi");
            }}
            className={`${
              selectedEmergencyType == "polisi"
                ? "border-orange-100"
                : "border-gray-50"
            } flex flex-col items-center w-full h-auto p-4 border  bg-white rounded-lg shadow-sm cursor-pointer transition`}
          >
            <div className="rounded-full p-3 bg-red-50">
              <FaCarOn className="text-red-400 text-xl" />
            </div>
            <div className="text-center">
              <h2 className="mt-2 font-medium text-gray-700 text-md">Polisi</h2>
            </div>
          </div>
        </div>

        {/* <div className="mt-5">
          <h2 className="text-gray-700 font-medium">Di mana lokasimu?</h2>
          <form className="mt-2">
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                <HiMagnifyingGlass className="text-gray-500" />
              </div>
              <input
                type="text"
                className="bg-white shadow-sm border border-gray-100 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
                placeholder="Cari lokasimu saat ini"
              />
            </div>
          </form>
        </div> */}

        <Link
          href={{
            pathname: "/detail",
            query: { type: selectedEmergencyType },
          }}
        >
          <button className="w-full mt-4 shadow-none border-0 bg-red-600 py-3 px-4 rounded-lg font-medium text-white">
            Cari {selectedEmergencyType} sekarang
          </button>
        </Link>
      </div>

      <BottomSheetMain
        isOpen={bottomSheet.isOpen}
        onClose={bottomSheet.onClose}
        onOpen={bottomSheet.onOpen}
        sheetTitle="Cari lokasimu saat ini"
      >
        <h1 className="tex-gray-500 text-xl">children nya wkw</h1>
      </BottomSheetMain>
    </div>
  );
};

export default BottomMenu;
