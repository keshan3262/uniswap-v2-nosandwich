import { useCallback } from "react";
import clsx from "clsx";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { ZERO_ADDRESS } from "~~/utils/scaffold-eth/common";

export interface AssetProps {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface AssetItemProps {
  asset: AssetProps;
  selected: boolean;
  onClick: (address: string) => void;
}

export const AssetItem = ({ asset, selected, onClick }: AssetItemProps) => {
  const { address: accountAddress } = useAccount();

  const handleClick = useCallback(() => onClick(asset.address), [asset.address, onClick]);

  const { data: balance, isLoading } = useReadContract({
    abi: deployedContracts[31337].ERC20.abi,
    address: asset.address as `0x${string}`,
    functionName: "balanceOf",
    args: [accountAddress ?? ZERO_ADDRESS],
  });

  return (
    <button
      className={clsx("btn btn-ghost flex items-center justify-between w-full", selected && "btn-accent")}
      onClick={handleClick}
    >
      <div className="gap-1">
        <p className="text-sm font-semibold">{asset.name}</p>
        <p className="text-xs text-gray-500">{asset.symbol}</p>
      </div>

      <span>
        {!balance && isLoading && <span className="loading loading-spinner loading-md" />}
        {balance !== undefined && accountAddress && formatUnits(balance, asset.decimals)}
      </span>
    </button>
  );
};
