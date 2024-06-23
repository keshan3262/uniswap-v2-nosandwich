"use client";

import { useCallback, useState } from "react";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { get } from "lodash";
import {
  FieldErrors,
  FieldPath,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { formatUnits, parseUnits } from "viem";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { SlippageToleranceOption } from "~~/components/SlippageToleranceOption";
import { SwapsResults, SwapsResultsView } from "~~/components/SwapsResultsView";
import { doButterSwapSimulation, doUniSwapSimulation, getAmountOut, toButterSwapParams } from "~~/utils/math";
import { notification } from "~~/utils/scaffold-eth";
import { createAmountValidationFn } from "~~/utils/validations";

interface RawSwapParams {
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  slippageTolerance: string;
}

interface SwapFormValues {
  initialA: string;
  initialB: string;
  swapsParams: RawSwapParams[];
}

const slippageToleranceOptions = ["0.1", "0.5", "1", "5", "10"];

const validateAmount = createAmountValidationFn(6);

const getErrorAfterSubmit = (
  path: FieldPath<SwapFormValues>,
  errors: FieldErrors<SwapFormValues>,
  submitCount: number,
) => (submitCount === 0 ? undefined : get(errors, path));

export const SwapForm = () => {
  const { register, control, handleSubmit, formState, setValue, watch } = useForm<SwapFormValues>({
    mode: "onChange",
    defaultValues: {
      initialA: "",
      initialB: "",
      swapsParams: [],
    },
  });
  const { errors, submitCount } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: "swapsParams" });
  const initialAError = getErrorAfterSubmit("initialA", errors, submitCount);
  const initialBError = getErrorAfterSubmit("initialB", errors, submitCount);
  const [swapsResults, setSwapsResults] = useState<SwapsResults | null>(null);

  const appendEmptyItem = useCallback(() => {
    append({ amountIn: "", amountOut: "", tokenIn: "0", slippageTolerance: "0.1" });
  }, [append]);

  const onSubmit = useCallback((values: SwapFormValues) => {
    if (values.swapsParams.length === 0) {
      notification.error("At least one swap is required");

      return;
    }

    const { initialA: rawInitialA, initialB: rawInitialB, swapsParams: rawSwapsParams } = values;

    const swaps = rawSwapsParams.map(({ amountIn, amountOut, tokenIn }) => ({
      amountIn: parseUnits(amountIn, 6),
      tokenIn: tokenIn === "0" ? (0 as const) : (1 as const),
      amountOut: parseUnits(amountOut, 6),
    }));
    const initialA = parseUnits(rawInitialA, 6);
    const initialB = parseUnits(rawInitialB, 6);
    try {
      setSwapsResults({
        butterSwap: doButterSwapSimulation([initialA, initialB], toButterSwapParams(Object.assign([], swaps))),
        uniSwap: doUniSwapSimulation([initialA, initialB], Object.assign([], swaps)),
        originalSwaps: swaps,
      });
    } catch (error) {
      console.error(error);
      notification.error(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Initial liquidity amount</span>
          </div>
          <label className={clsx("input input-bordered flex items-center pr-0", initialAError && "input-error")}>
            <input
              type="text"
              placeholder="0"
              className="grow bg-transparent"
              {...register("initialA", { validate: validateAmount })}
            />
            <div className="h-full bordered border-r ml-2" />
            <button className="btn btn-ghost w-32 rounded-l-none" type="button">
              T0
            </button>
          </label>
          <div className="label">
            <span className="label-text-alt text-error">{initialAError?.message}</span>
          </div>
        </label>

        <label className="form-control w-full">
          <label className={clsx("input input-bordered flex items-center pr-0", initialBError && "input-error")}>
            <input
              type="text"
              placeholder="0"
              className="grow bg-transparent"
              {...register("initialB", { validate: validateAmount })}
            />
            <div className="h-full bordered border-r ml-2" />
            <button className="btn btn-ghost w-32 rounded-l-none" type="button">
              T1
            </button>
          </label>
          <div className="label">
            <span className="label-text-alt text-error">{initialBError?.message}</span>
          </div>
        </label>

        <div className="text-sm flex items-center justify-between">
          <span className="text-sm">Swaps</span>

          <button className="btn btn-sm" type="button" onClick={appendEmptyItem}>
            +
          </button>
        </div>

        {fields.map((field, index) => (
          <SwapItem
            key={field.id}
            index={index}
            errors={errors}
            onRemoveClick={remove}
            setValue={setValue}
            register={register}
            watch={watch}
          />
        ))}

        <button type="submit" className="btn btn-primary w-full">
          Swap
        </button>

        {swapsResults && <SwapsResultsView results={swapsResults} />}
      </div>
    </form>
  );
};

interface SwapItemProps {
  index: number;
  errors: FieldErrors<SwapFormValues>;
  onRemoveClick: UseFieldArrayRemove;
  setValue: UseFormSetValue<SwapFormValues>;
  register: UseFormRegister<SwapFormValues>;
  watch: UseFormWatch<SwapFormValues>;
}

export const SwapItem = ({ errors, index, onRemoveClick, setValue, register, watch }: SwapItemProps) => {
  const handleRemoveClick = useCallback(() => onRemoveClick(index), [index, onRemoveClick]);
  const tokenInPath: `swapsParams.${number}.tokenIn` = `swapsParams.${index}.tokenIn`;
  const amountInPath: `swapsParams.${number}.amountIn` = `swapsParams.${index}.amountIn`;
  const amountOutPath: `swapsParams.${number}.amountOut` = `swapsParams.${index}.amountOut`;
  const amountIn = watch(amountInPath);
  const initialA = watch("initialA");
  const initialB = watch("initialB");
  const tokenIn = watch(tokenInPath);
  const slippageTolerance = watch(`swapsParams.${index}.slippageTolerance`);
  const amountInError = getErrorAfterSubmit(amountInPath, errors, 1);
  const amountOutError = getErrorAfterSubmit(amountOutPath, errors, 1);

  const handleReverseSwap = useCallback(() => {
    setValue(tokenInPath, tokenIn === "0" ? "1" : "0");
    setValue(amountInPath, "");
    setValue(amountOutPath, "");
  }, [amountInPath, amountOutPath, tokenIn, setValue, tokenInPath]);

  const { onChange: hookFormOnAmountInChange, ...restAmountInHookFormProps } = register(amountInPath, {
    validate: validateAmount,
  });

  const updateAmountOut = useCallback(
    (newAmountIn: string, newSlippageTolerance: string) => {
      if ([newAmountIn, initialA, initialB].every(value => validateAmount(value) === true)) {
        const amountOutBeforeSlippage = getAmountOut(
          [BigInt(parseUnits(initialA, 6)), BigInt(parseUnits(initialB, 6))],
          BigInt(parseUnits(newAmountIn, 6)),
          Number(tokenIn) as 0 | 1,
        );
        const amountOut = new BigNumber(amountOutBeforeSlippage.toString())
          .times(new BigNumber(100).minus(newSlippageTolerance))
          .div(100)
          .toFixed(0, BigNumber.ROUND_FLOOR);

        setValue(amountOutPath, formatUnits(BigInt(amountOut), 6));
      } else {
        setValue(amountOutPath, "");
      }
    },
    [amountOutPath, initialA, initialB, setValue, tokenIn],
  );

  const handleAmountInChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      hookFormOnAmountInChange(event);
      updateAmountOut(event.target.value, slippageTolerance);
    },
    [hookFormOnAmountInChange, updateAmountOut, slippageTolerance],
  );
  const handleSlippageToleranceChange = useCallback(
    (value: string) => {
      setValue(`swapsParams.${index}.slippageTolerance`, value);
      updateAmountOut(amountIn, value);
    },
    [amountIn, index, setValue, updateAmountOut],
  );

  return (
    <>
      <div className="flex gap-2">
        <div className="flex gap-2">
          <div className="text-sm" style={{ marginTop: 16 }}>
            {index + 1}.
          </div>

          <label className="form-control">
            <label className={clsx("input input-bordered flex items-center pr-0", amountInError && "input-error")}>
              <input
                type="text"
                placeholder="0"
                className="grow w-full bg-transparent"
                {...restAmountInHookFormProps}
                onChange={handleAmountInChange}
              />
              <div className="h-full bordered border-r ml-2" />
              <button className="btn btn-ghost w-12 rounded-l-none" type="button">
                {tokenIn === "0" ? "T0" : "T1"}
              </button>
            </label>
            <div className="label">
              <span className="label-text-alt text-error">{amountInError?.message}</span>
            </div>
          </label>
        </div>

        <button className="btn btn-sm btn-ghost btn-circle mt-2" type="button" onClick={handleReverseSwap}>
          <ArrowsRightLeftIcon className="w-6 h-6" />
        </button>
        <input type="text" className="hidden" {...register(tokenInPath)} />

        <label className="form-control">
          <label className={clsx("input input-bordered flex items-center pr-0", amountOutError && "input-error")}>
            <input
              type="text"
              placeholder="0"
              className="grow w-full bg-transparent"
              readOnly
              {...register(amountOutPath, { validate: validateAmount })}
            />
            <div className="h-full bordered border-r ml-2" />
            <button className="btn btn-ghost w-12 rounded-l-none" type="button">
              {tokenIn === "0" ? "T1" : "T0"}
            </button>
          </label>
          <div className="label">
            <span className="label-text-alt text-error">{amountOutError?.message}</span>
          </div>
        </label>

        <button className="btn btn-sm mt-2" type="button" onClick={handleRemoveClick}>
          -
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-sm">Slippage tolerance</span>
        <div className="flex">
          {slippageToleranceOptions.map((option, optionIndex) => (
            <SlippageToleranceOption
              key={option}
              value={option}
              isFirst={optionIndex === 0}
              isLast={optionIndex === slippageToleranceOptions.length - 1}
              isSelected={slippageTolerance === option}
              onClick={handleSlippageToleranceChange}
            />
          ))}
        </div>
      </div>
    </>
  );
};
