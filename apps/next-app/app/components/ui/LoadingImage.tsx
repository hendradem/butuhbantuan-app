import React from "react";

function LoadingImage() {
  return (
    <svg
      className="mx-auto"
      xmlns="http://www.w3.org/2000/svg"
      width="128"
      height="124"
      viewBox="0 0 128 124"
      fill="none"
    >
      <g filter="url(#filter0_d_14133_718)">
        <path
          d="M4 61.0062C4 27.7823 30.9309 1 64.0062 1C97.0319 1 124 27.7699 124 61.0062C124 75.1034 119.144 88.0734 110.993 98.3057C99.7572 112.49 82.5878 121 64.0062 121C45.3007 121 28.2304 112.428 17.0071 98.3057C8.85599 88.0734 4 75.1034 4 61.0062Z"
          fill="#F9FAFB"
        />
      </g>
      <g>
        <circle
          cx="107.929"
          cy="91.0001"
          r="18.7143"
          fill="#EEF2FF"
          stroke="#E5E7EB"
        />
        <g transform="rotate(0 107.125 90.1965)">
          <path
            d="M115.161 98.2322L113.152 96.2233M113.554 90.1965C113.554 86.6461 110.676 83.7679 107.125 83.7679C103.575 83.7679 100.697 86.6461 100.697 90.1965C100.697 93.7469 103.575 96.6251 107.125 96.6251C108.893 96.6251 110.495 95.9111 111.657 94.7557C112.829 93.5913 113.554 91.9786 113.554 90.1965Z"
            stroke="#4F46E5"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 107.125 90.1965"
              to="360 107.125 90.1965"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>

      <defs>
        <filter
          id="filter0_d_14133_718"
          x="2"
          y="0"
          width="124"
          height="124"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_14133_718"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_14133_718"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default LoadingImage;
