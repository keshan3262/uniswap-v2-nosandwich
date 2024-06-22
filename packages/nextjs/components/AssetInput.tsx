"use client";

import { useCallback, useMemo, useRef } from "react";
import clsx from "clsx";
import { PathValue, UseFormReturn } from "react-hook-form";

export const ETH_ADDRESS = "eth";

type FormValuesFragment<InputName extends string, ValueInputName extends string> = {
  [k in InputName | ValueInputName]: string;
};

interface AssetProps {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface AssetInputProps<
  InputName extends string,
  ValueInputName extends string,
  FormValues extends FormValuesFragment<InputName, ValueInputName>,
> {
  tokens: AssetProps[];
  label: string;
  tokenInputName: InputName;
  tokenValueInputName: ValueInputName;
  form: UseFormReturn<FormValues>;
  parsedMaxAmount?: bigint;
}

export const AssetInput = <
  InputName extends string,
  ValueInputName extends string,
  FormValues extends FormValuesFragment<InputName, ValueInputName>,
>({
  label,
  tokenInputName,
  tokenValueInputName,
  form,
  tokens,
}: AssetInputProps<InputName, ValueInputName, FormValues>) => {
  const { register, watch, formState, setValue } = form;
  const { errors } = formState;
  const error = errors[tokenInputName] || errors[tokenValueInputName];
  const selectionModalRef = useRef<HTMLDialogElement>(null);
  const tokenAddress = watch(tokenInputName as any);
  const token = useMemo(() => tokens.find(t => t.address === tokenAddress), [tokenAddress, tokens]);
  const openTokenSelectModal = useCallback(() => selectionModalRef.current?.showModal(), []);
  const closeTokenSelectModal = useCallback(() => selectionModalRef.current?.close(), []);

  const validateToken = useCallback((value: PathValue<FormValues, any>) => (value as string).length > 0, []);

  const handleTokenSelect = useCallback(
    (tokenAddress: string) => {
      setValue(tokenInputName as any, tokenAddress as any);
      setValue(tokenValueInputName as any, "" as any);
    },
    [setValue, tokenInputName, tokenValueInputName],
  );

  return (
    <>
      <label className="form-control w-full">
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
        <label className={clsx("input input-bordered flex items-center pr-0", error && "input-error")}>
          <input type="text" placeholder="0" className="grow" {...register(tokenValueInputName as any, {})} />
          <input type="text" className="hidden" {...register(tokenInputName as any, { validate: validateToken })} />
          <div className="h-full bordered border-r ml-2" />
          <button className="btn btn-ghost w-32 rounded-l-none" type="button" onClick={openTokenSelectModal}>
            {token?.symbol ?? "Select"}
          </button>
        </label>
        <div className="label">
          <span className="label-text-alt text-error">{error?.message as string | undefined}</span>
        </div>
      </label>

      <dialog className="modal modal-bottom sm:modal-middle" ref={selectionModalRef}>
        <div className="modal-box">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={closeTokenSelectModal}>
            ✕
          </button>
          <h3 className="font-bold text-lg text-center">Select a token</h3>
          {tokens.map(token => (
            <p key={token.address} onClick={() => handleTokenSelect(token.address)}>
              {token.symbol}
            </p>
          ))}
        </div>
      </dialog>
    </>
  );
};
