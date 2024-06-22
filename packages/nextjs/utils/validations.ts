import { formatUnits, parseUnits } from "viem";

interface ValidationMessages {
  required?: string;
  validNumber?: string;
  min?: string;
  max?: string;
  decimalsConstraint?: string;
}

export const createAmountValidationFn = (
  decimals: number | bigint,
  messages: ValidationMessages,
  parsedMaxAmount?: bigint,
) => {
  const normalizedDecimals = Number(decimals);

  const {
    required: requiredMessage = "This field is required",
    validNumber: validNumberMessage = "Must be a valid number",
    min: minMessage = "Must be positive",
    max: maxMessage = parsedMaxAmount
      ? `Must be less than ${formatUnits(parsedMaxAmount, normalizedDecimals)}`
      : "Too high value",
    decimalsConstraint = `Must have at most ${normalizedDecimals} decimals`,
  } = messages;

  return (value?: string) => {
    if (!value) {
      return requiredMessage;
    }

    try {
      const parsedAmount = parseUnits(value, normalizedDecimals);

      if (parsedAmount <= 0) {
        return minMessage;
      }

      if (parsedMaxAmount && parsedAmount > parsedMaxAmount) {
        return maxMessage;
      }

      const decimalsAmount = value.split(".")[1].length;

      if (decimalsAmount > normalizedDecimals) {
        return decimalsConstraint;
      }

      return true;
    } catch (e) {
      return validNumberMessage;
    }
  };
};
