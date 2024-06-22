import { BackButton } from "./BackButton";
import { ContractTabs } from "./ContractTabs";
import { Address, Balance } from "~~/components/scaffold-eth";

export const AddressComponent = ({
  address,
  contractData,
}: {
  address: string;
  contractData: { bytecode: string; assembly: string } | null;
}) => {
  const castAddress = address as `0x${string}`;

  return (
    <div className="m-10 mb-20">
      <div className="flex justify-start mb-5">
        <BackButton />
      </div>
      <div className="col-span-5 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div className="col-span-1 flex flex-col">
          <div className="bg-base-100 border-base-300 border shadow-md shadow-secondary rounded-3xl px-6 lg:px-8 mb-6 space-y-1 py-4 overflow-x-auto">
            <div className="flex">
              <div className="flex flex-col gap-1">
                <Address address={castAddress} format="long" />
                <div className="flex gap-1 items-center">
                  <span className="font-bold text-sm">Balance:</span>
                  <Balance address={castAddress} className="text" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ContractTabs address={castAddress} contractData={contractData} />
    </div>
  );
};
