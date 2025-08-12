import React, { useEffect } from "react";

import { FaTimes } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { MdAddToHomeScreen } from "react-icons/md";
import { ImArrowUp } from "react-icons/im";

// interface Props {
//   closePrompt: () => void;
//   doNotShowAgain: () => void;
// }

export default function AddToHomeScreen() {
  //   const { closePrompt, doNotShowAgain } = props;

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent Chrome default mini-infobar
      e.preventDefault();
      console.log("A2HS event captured");
      // Tampilkan tombol install (misalnya di UI)
    });
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[60%] z-50 pt-12 px-4 text-white">
      <ImArrowUp className="text-4xl absolute top-[10px] right-[10px] text-indigo-700 z-10 animate-bounce" />
      <div className="relative bg-primary p-4 h-full rounded-xl flex flex-col justify-around items-center text-center">
        <button className="absolute top-0 right-0 p-3">
          <FaTimes className="text-2xl" />
        </button>
        <p className="text-lg">
          For the best experience, we recommend installing the Valley Trader app
          to your home screen!
        </p>
        <div className="flex gap-2 items-center text-lg">
          <p>Click the</p>
          <HiDotsVertical className="text-4xl" />
          <p>icon</p>
        </div>
        <div className="flex flex-col gap-2 items-center text-lg w-full px-4">
          <p>Scroll down and then click:</p>
          <div className="bg-zinc-50 flex justify-between items-center w-full px-4 py-2 rounded-lg text-zinc-900">
            <MdAddToHomeScreen className="text-2xl" />
            <p>Add to Home Screen</p>
          </div>
        </div>
        <button className="border-2 p-1">Don&apos;t show again</button>
      </div>
    </div>
  );
}
