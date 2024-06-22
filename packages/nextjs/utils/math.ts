interface SwapParams {
  amountIn: bigint;
  amountOut: bigint;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

interface SwapResult {
  amountIn: bigint;
  amountOut: bigint;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function doButterSwapSimulation(_initialA: bigint, _initialB: bigint, _swaps: SwapParams[]): SwapResult[] {
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function doUniSwapSimulation(_initialA: bigint, _initialB: bigint, _swaps: SwapParams[]): SwapResult[] {
  return [];
}
