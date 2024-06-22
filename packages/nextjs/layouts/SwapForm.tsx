"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  /* useAccount, */
  useWalletClient,
} from "wagmi";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { AssetInput, ETH_ADDRESS } from "~~/components/AssetInput";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

interface SwapFormValues {
  tokenA: string;
  tokenAValue: string;
  tokenB: string;
  tokenBValue: string;
}

export const SwapForm = () => {
  // const { address: accountAddress } = useAccount();
  const { data: walletClient /* , isLoading: walletClientLoading */ } = useWalletClient();
  const { data: wethContract /*, isLoading: wethContractLoading */ } = useScaffoldContract({
    contractName: "WrappedNativeToken",
    walletClient,
  });
  const { data: tokenContract /* , isLoading: tokenContractLoading */ } = useScaffoldContract({
    contractName: "Token",
    walletClient,
  });

  // const tokenListLoading = wethContractLoading || tokenContractLoading;
  const tokenList = useMemo(
    () =>
      tokenContract && wethContract
        ? [
            { address: ETH_ADDRESS, name: "Ether", symbol: "ETH", decimals: 18 },
            { address: wethContract.address, name: "Wrapped Ether", symbol: "WETH", decimals: 18 },
            { address: tokenContract.address, name: "Butter DX", symbol: "BDX", decimals: 18 },
          ]
        : [{ address: "eth", name: "Ether", symbol: "ETH", decimals: 18 }],
    [tokenContract, wethContract],
  );

  const form = useForm<SwapFormValues>({
    defaultValues: {
      tokenA: ETH_ADDRESS,
      tokenAValue: "",
      tokenB: "",
      tokenBValue: "",
    },
  });
  const { handleSubmit } = form;

  const onSubmit = useCallback((values: SwapFormValues) => {
    console.log("TODO: make a swap", values);
  }, []);

  const reverseExchange = useCallback(() => {
    console.log("TODO: Implement reverse exchange");
  }, []);

  return (
    <form className="flex flex-col gap-y-2" onSubmit={handleSubmit(onSubmit)}>
      <AssetInput
        form={form}
        tokens={tokenList}
        label="Input"
        tokenInputName="tokenA"
        tokenValueInputName="tokenAValue"
      />
      <div className="w-full flex justify-center">
        <button type="button" className="btn btn-circle btn-ghost btn-sm shadow-center" onClick={reverseExchange}>
          <ArrowsUpDownIcon className="w-6 h-auto" />
        </button>
      </div>
      <AssetInput
        form={form}
        tokens={tokenList}
        label="Output"
        tokenInputName="tokenB"
        tokenValueInputName="tokenBValue"
      />
      <button type="submit" className="btn btn-primary w-full">
        Swap
      </button>
    </form>
  );
};
