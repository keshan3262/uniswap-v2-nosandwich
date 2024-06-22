interface SwapParams {
  amountIn: bigint;
  amountOut: bigint;
  minAmountOut: bigint;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

export interface SwapResult {
  amountIn: bigint;
  amountOut: bigint;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function doButterSwapSimulation(_initialA: bigint, _initialB: bigint, swaps: SwapParams[]): SwapResult[] {
  return swaps;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function doUniSwapSimulation(_initialA: bigint, _initialB: bigint, swaps: SwapParams[]): SwapResult[] {
  return swaps;
}
