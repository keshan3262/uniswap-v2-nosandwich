"use client";

import type { NextPage } from "next";
import { DeployTokenForm } from "~~/layouts/DeployTokenForm";
import { SwapForm } from "~~/layouts/SwapForm";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex justify-center items-center flex-col flex-grow p-10 sm:p-5">
        <div
          role="tablist"
          className="tabs tabs-bordered w-full max-w-md bg-white rounded-lg shadow-center grid-cols-3"
        >
          <input type="radio" name="my_tabs_1" role="tab" className="tab" aria-label="Deploy token" />
          <div role="tabpanel" className="tab-content text-sm p-10 sm:p-5">
            <DeployTokenForm />
          </div>

          <input type="radio" name="my_tabs_1" role="tab" className="tab" aria-label="Swap" defaultChecked />
          <div role="tabpanel" className="tab-content text-sm p-10 sm:p-5">
            <SwapForm />
          </div>

          <input type="radio" name="my_tabs_1" role="tab" className="tab" aria-label="Remove liquidity" />
          <div role="tabpanel" className="tab-content text-sm p-10 sm:p-5">
            TODO: Add a form for removing liquidity
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
