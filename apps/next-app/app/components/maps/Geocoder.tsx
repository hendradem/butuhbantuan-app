import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useControl } from "react-map-gl";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { useEffect } from "react";

const Geocoder = () => {
  const control = new MapboxGeocoder({
    accessToken:
      "pk.eyJ1IjoiaGVuZHJhYWRlbSIsImEiOiJjbHE4NzdxMnkwbjdqMm1xcTVzanowNWRnIn0.8pRRX4WuAsiPJ3lRnROXRQ",
    marker: false,
    collapsed: false,
  });

  useControl(() => control);
  control.on("result", (res) => {
    console.log(res);
  });

  return null;

  // return (
  //   <>
  //     <form className="mt-5 mx-5">
  //       <div className="relative">
  //         <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
  //           <HiMagnifyingGlass className="text-gray-500" />
  //         </div>
  //         <input
  //           type="text"
  //           id=""
  //           className="bg-white shadow-sm border border-gray-100 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
  //           placeholder="Cari lokasimu saat ini"
  //         />
  //       </div>
  //     </form>
  //   </>
  // );
};

export default Geocoder;
