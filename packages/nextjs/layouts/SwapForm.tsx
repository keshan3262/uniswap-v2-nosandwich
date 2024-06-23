"use client";

import { useCallback, useState } from "react";
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
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { SlippageToleranceOption } from "~~/components/SlippageToleranceOption";
import { SwapsResultsView } from "~~/components/SwapsResultsView";
import {
  SimulationResult,
  doButterSwapSimulation,
  doUniSwapSimulation,
  getAmountOut,
  toButterSwapParams,
} from "~~/utils/math";
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

interface SwapsResults {
  butterSwap: SimulationResult;
  uniSwap: SimulationResult;
}

const slippageToleranceOptions = ["0.1", "0.5", "1", "5", "10"];

const validateAmount = createAmountValidationFn(0, { decimalsConstraint: "Must be integer" });

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

    const processedValues = {
      initialA: BigInt(values.initialA),
      initialB: BigInt(values.initialB),
      swaps: values.swapsParams.map(swap => ({
        amountIn: BigInt(swap.amountIn),
        tokenIn: swap.tokenIn === "0" ? (0 as const) : (1 as const),
        amountOut: (BigInt(swap.amountOut) * BigInt((100 - Number(swap.slippageTolerance)) * 10)) / BigInt(1000),
      })),
    };
    try {
      setSwapsResults({
        butterSwap: doButterSwapSimulation(
          [processedValues.initialA, processedValues.initialB],
          toButterSwapParams(Object.assign([], processedValues.swaps)),
        ),
        uniSwap: doUniSwapSimulation(
          [processedValues.initialA, processedValues.initialB],
          Object.assign([], processedValues.swaps),
        ),
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
  const handleAmountInChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      hookFormOnAmountInChange(event);
      const newAmountIn = event.target.value;
      if ([newAmountIn, initialA, initialB].every(value => validateAmount(value) === true)) {
        setValue(
          amountOutPath,
          getAmountOut([BigInt(initialA), BigInt(initialB)], BigInt(newAmountIn), Number(tokenIn) as 0 | 1).toString(),
        );
      } else {
        setValue(amountOutPath, "");
      }
    },
    [amountOutPath, hookFormOnAmountInChange, initialA, initialB, setValue, tokenIn],
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
              onClick={value => setValue(`swapsParams.${index}.slippageTolerance`, value)}
            />
          ))}
        </div>
      </div>
    </>
  );
};
