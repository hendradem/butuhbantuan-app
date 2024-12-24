import React from "react";
import { FaMapPin } from "react-icons/fa";

const Topnav = () => {
  return (
    <div className="w-full bg-orange-100 h-12 flex flex-row">
      <div className="w-full bg-orange-300">
        <FaMapPin size={10} />
      </div>
      <div className="w-full bg-orange-200"> asd </div>
    </div>
  );
};

export default Topnav;
