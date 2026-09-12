"use client";

import dynamic from "next/dynamic";

const OfficialStartPage = dynamic(() => import("../components/gardevoir/OfficialStartPage"), {
  ssr: false,
});

export default function Page() {
  return <OfficialStartPage />;
}
