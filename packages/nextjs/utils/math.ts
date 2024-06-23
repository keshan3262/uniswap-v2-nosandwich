interface SwapParams {
  amountIn: bigint;
  amountOut: bigint;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

// Converting to ButterSwap params:
// for BUY: minTick  = 0, maxTick = tickFromPrice(amountIn/amountOut)
// for SELL: minTick  = tickFromPrice(amountOut/amountIn), maxTick = infinity

function toButterSwapParam(swap: SwapParams): BSwapParams {
  let butteredParam: BSwapParams;
  if (swap.tokenIn === 0) {
    butteredParam = {
      amountIn: swap.amountIn,
      maxTick: priceToTick(Number(swap.amountIn) / Number(swap.amountOut)),
      minTick: 0,
      tokenIn: 0,
    };
  } else {
    butteredParam = {
      amountIn: swap.amountIn,
      maxTick: Number.POSITIVE_INFINITY,
      minTick: priceToTick(Number(swap.amountOut) / Number(swap.amountIn)),
      tokenIn: 1,
    };
  }
  console.log(butteredParam);
  return butteredParam;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function toButterSwapParams(swaps: SwapParams[]): BSwapParams[] {
  console.log(swaps);
  return swaps.map(toButterSwapParam);
}

interface BSwapParams {
  amountIn: bigint;
  maxTick: number;
  minTick: number;
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

export interface SwapResult {
  amountIn: bigint;
  amountOut: bigint;
  status: "success" | "failure";
  /* 0 stands for selling the first token */
  tokenIn: 0 | 1;
}

interface TickInfo {
  supply0Diff: bigint;
  supply1Diff: bigint;
}
interface PendingSwapNFT {
  amountIn: bigint;
  maxTick: number;
  minTick: number;
  tokenIn: 0 | 1;
}

export interface SimulationResult {
  reserves: [bigint, bigint];
  swaps: SwapResult[];
}

export function getAmountOut(reserves: [bigint, bigint], amountIn: bigint, tokenIn: 0 | 1) {
  const reserveIn = reserves[tokenIn];
  const reserveOut = reserves[1 - tokenIn];

  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

export function doUniSwapSimulation(reserves: [bigint, bigint], swaps: SwapParams[]): SimulationResult {
  const result: SwapResult[] = [];
  for (const swap of swaps) {
    if (swap.amountIn <= 0) {
      result.push({
        amountIn: swap.amountIn,
        amountOut: 0n,
        status: "failure",
        tokenIn: swap.tokenIn,
      });
      continue;
    }

    const amountOut = getAmountOut(reserves, swap.amountIn, swap.tokenIn);

    if (amountOut < swap.amountOut) {
      result.push({
        amountIn: swap.amountIn,
        amountOut,
        status: "failure",
        tokenIn: swap.tokenIn,
      });
      continue;
    }

    result.push({
      amountIn: swap.amountIn,
      amountOut,
      status: "success",
      tokenIn: swap.tokenIn,
    });

    reserves[swap.tokenIn] += swap.amountIn;
    reserves[1 - swap.tokenIn] -= amountOut;
  }

  return {
    reserves,
    swaps: result,
  };
}

const NEW_TICK_INFO: TickInfo = {
  supply0Diff: 0n,
  supply1Diff: 0n,
};

// price = 1.0001^tick
const tickToPrice = (tick: number) => {
  return 1.0001 ** tick;
};

// tick = log_1.0001(price)
// tick = log(price) / log(1.0001)
const priceToTick = (price: number) => {
  return Math.floor(Number(Math.log(Number(price)) / Math.log(1.0001)));
};

function doClearing(
  currentTick: number,
  currentReserves: [bigint, bigint],
  ticksInfo: { [tick: number]: TickInfo },
  slot0: { minTickSell: number; maxTickBuy: number },
  clearingSteps: Array<any> = [],
) {
  console.log("doClearing");
  console.log(clearingSteps);
  console.log(slot0);
  console.log(ticksInfo);
  // console.log(ticksInfo);
  const sortedTicks: number[] = Object.keys(ticksInfo)
    .map(tick => Number(tick))
    .sort((a, b) => (a > b ? 1 : -1));
  // let finalPriceTick: number = currentTick;
  // console.log(currentTick);

  // console.log(currentReserves);
  // console.log(slot0.maxTickBuy);
  while (currentTick < slot0.maxTickBuy) {
    const tickPointer = slot0.maxTickBuy;
    const tickInfo = ticksInfo[slot0.maxTickBuy];
    const startReserves = currentReserves;
    const { reserves: newReserves, swaps } = doUniSwapSimulation(
      [currentReserves[0], currentReserves[1]],
      [{ amountIn: tickInfo.supply0Diff, tokenIn: 0, amountOut: 0n }],
    );
    // console.log(newReserves, swaps);
    if (swaps[0].status === "failure") {
      console.log("failure");
      break;
    }
    const tickAfterSwap = priceToTick(Number(newReserves[0]) / Number(newReserves[1]));
    console.log(tickAfterSwap);
    console.log(slot0.maxTickBuy);

    if (tickAfterSwap < slot0.maxTickBuy) {
      // finalPriceTick = tickAfterSwap;
      currentReserves = newReserves;
      // console.log(currentReserves);

      const nextTick = sortedTicks.reverse().find(tick => tick < slot0.maxTickBuy);
      // console.log(nextTick);

      // console.log(slot0.maxTickBuy);
      // console.log(nextTick);
      // TODO: tick at price0
      console.log("SWAP BUY");
      slot0.maxTickBuy = nextTick === undefined ? priceToTick(0) : nextTick;
      clearingSteps.push({
        reserves: { startReserves, endReserves: currentReserves },
        ticks: {
          tickPointer,
          tickAfterSwap,
          nextTick,
        },
        prices: {
          priceBefore: tickToPrice(tickPointer).toFixed(18),
          priceAfter: tickToPrice(tickAfterSwap).toFixed(18),
          priceNext: tickToPrice(slot0.maxTickBuy).toFixed(18),
        },
      });
      if (nextTick === undefined) {
        break;
      }
    } else {
      break;
    }
  }
  // console.log(currentTick);
  // console.log(slot0.minTickSell);

  while (currentTick > slot0.minTickSell) {
    const tickPointer = slot0.minTickSell;
    const tickInfo = ticksInfo[slot0.minTickSell];
    const startReserves = currentReserves;
    const { reserves: newReserves, swaps } = doUniSwapSimulation(
      [currentReserves[0], currentReserves[1]],
      [{ amountIn: tickInfo.supply1Diff, tokenIn: 1, amountOut: 0n }],
    );
    // console.log(newReserves, swaps);
    if (swaps[0].status === "failure") {
      console.log("failure");
      break;
    }
    const tickAfterSwap = priceToTick(Number(newReserves[0]) / Number(newReserves[1]));
    // console.log(tickAfterSwap);
    console.log("SWAP SELL");

    if (tickAfterSwap > slot0.minTickSell) {
      // finalPriceTick = tickAfterSwap;
      currentReserves = newReserves;
      // console.log(currentReserves);

      const nextTick = sortedTicks.find(tick => tick > slot0.minTickSell);
      console.log(nextTick);
      // if (nextTick === undefined) {
      //   break;
      // }
      // console.log(slot0.minTickSell);
      // console.log(nextTick);
      slot0.minTickSell = nextTick === undefined ? infinity : nextTick;
      clearingSteps.push({
        reserves: { startReserves, endReserves: currentReserves },
        ticks: {
          tickPointer,
          tickAfterSwap,
          nextTick,
        },
        prices: {
          priceBefore: tickToPrice(tickPointer).toFixed(18),
          priceAfter: tickToPrice(tickAfterSwap).toFixed(18),
          priceNext: tickToPrice(slot0.minTickSell).toFixed(18),
        },
      });
      if (nextTick === undefined) {
        break;
      }
    } else {
      break;
    }
  }
  // We should check if we need to do more clearing
  // Will be implemented as recursion call.
  // Will optimize later.
  console.log(currentTick, slot0.maxTickBuy, slot0.minTickSell);
  console.log(currentReserves);
  // if (currentTick < slot0.maxTickBuy || currentTick > slot0.minTickSell) {
  //   return doClearing(currentTick, currentReserves, ticksInfo, slot0, clearingSteps);
  // }
  console.log(sortedTicks);
  console.log(JSON.stringify(clearingSteps, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2));
  return { currentReserves, currentTick, slot0, clearingSteps };
}

const infinity = Number.POSITIVE_INFINITY;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function doButterSwapSimulation(reserves: [bigint, bigint], swaps: BSwapParams[]): SimulationResult {
  const result: SwapResult[] = [];
  const pendingSwaps: PendingSwapNFT[] = [];
  const ticksInfo: { [tick: number]: TickInfo } = {};
  const slot0 = {
    minTickSell: infinity,
    maxTickBuy: priceToTick(0),
  };

  // STORE INTENDS
  for (const swap of swaps) {
    if (swap.amountIn <= 0) {
      result.push({
        amountIn: swap.amountIn,
        amountOut: 0n,
        status: "failure",
        tokenIn: swap.tokenIn,
      });
      continue;
    }

    // buy token 1
    if (swap.tokenIn === 0) {
      // TODO: calculate based on prices
      const minTick = priceToTick(0);
      // console.log(swap.amountIn / swap.amountOut);
      const maxTick = Number(swap.maxTick);
      if (slot0.maxTickBuy < maxTick) {
        slot0.maxTickBuy = maxTick;
      }

      pendingSwaps.push({
        amountIn: swap.amountIn,
        maxTick,
        minTick,
        tokenIn: swap.tokenIn,
      });

      if (!ticksInfo[minTick]) {
        ticksInfo[minTick] = NEW_TICK_INFO;
      }
      if (!ticksInfo[maxTick]) {
        ticksInfo[maxTick] = NEW_TICK_INFO;
      }
      ticksInfo[minTick] = {
        supply0Diff: ticksInfo[minTick].supply0Diff - swap.amountIn,
        supply1Diff: ticksInfo[minTick].supply1Diff,
      };
      ticksInfo[maxTick] = {
        supply0Diff: ticksInfo[maxTick].supply0Diff + swap.amountIn,
        supply1Diff: ticksInfo[maxTick].supply1Diff,
      };
    }
    // sell token 1
    else {
      // p = reserve0 / reserve1
      // TODO: calculate prices
      // console.log(swap.amountOut / swap.amountIn);

      const minTick = Number(swap.minTick);
      const maxTick = infinity;

      if (slot0.minTickSell > minTick) {
        slot0.minTickSell = minTick;
      }

      pendingSwaps.push({
        amountIn: swap.amountIn,
        maxTick,
        minTick,
        tokenIn: swap.tokenIn,
      });

      if (!ticksInfo[minTick]) {
        ticksInfo[minTick] = NEW_TICK_INFO;
      }
      if (!ticksInfo[maxTick]) {
        ticksInfo[maxTick] = NEW_TICK_INFO;
      }
      ticksInfo[minTick] = {
        supply0Diff: ticksInfo[minTick].supply0Diff,
        supply1Diff: ticksInfo[minTick].supply1Diff + swap.amountIn,
      };
      ticksInfo[maxTick] = {
        supply0Diff: ticksInfo[maxTick].supply0Diff,
        supply1Diff: ticksInfo[maxTick].supply1Diff - swap.amountIn,
      };
    }
  }
  // console.log(pendingSwaps);
  // console.log(ticksInfo);
  // CLEARING

  const {
    currentReserves,
    currentTick: finalPriceTick,
    slot0: newSlot0,
    clearingSteps,
  } = doClearing(priceToTick(Number(reserves[0]) / Number(reserves[1])), [reserves[0], reserves[1]], ticksInfo, slot0);
  console.log("clearingSteps");
  console.log(clearingSteps);
  console.log(newSlot0);
  slot0.minTickSell = newSlot0.minTickSell;
  slot0.maxTickBuy = newSlot0.maxTickBuy;
  console.log(currentReserves);
  console.log(finalPriceTick);
  const price = tickToPrice(finalPriceTick);
  console.log(price);
  console.log(reserves);
  console.log(currentReserves);
  const abs = (value: bigint) => (value < 0 ? -value : value);
  const totalReserves0Diff = abs(reserves[0] - currentReserves[0]);
  const totalReserves1Diff = abs(reserves[1] - currentReserves[1]);
  // DISTRIBUTE
  const swapResult: SwapResult[] = [];
  for (const pendingSwap of pendingSwaps) {
    console.log(pendingSwap);
    console.log(finalPriceTick);
    const { amountIn, tokenIn, maxTick, minTick } = pendingSwap;
    if (tokenIn === 0 && finalPriceTick < maxTick && slot0.maxTickBuy < maxTick) {
      // If token0in was sent by user, then he receives token0in*reserves1diff /reserves0diff.
      const amountOut = (amountIn * totalReserves1Diff) / totalReserves0Diff;
      swapResult.push({
        amountIn: amountIn,
        amountOut: amountOut,
        status: "success",
        tokenIn: tokenIn,
      });
    } else if (tokenIn === 1 && finalPriceTick > minTick && slot0.minTickSell > minTick) {
      // If token1in was sent by user, then he receives token1in*reserves0diff /reserves1diff.
      const amountOut = (amountIn * totalReserves0Diff) / totalReserves1Diff;
      swapResult.push({
        amountIn: amountIn,
        amountOut: amountOut,
        status: "success",
        tokenIn: tokenIn,
      });
    } else {
      swapResult.push({
        amountIn: amountIn,
        amountOut: 0n,
        status: "failure",
        tokenIn: tokenIn,
      });
    }
  }
  console.log("swapResult");
  return {
    reserves: currentReserves,
    swaps: swapResult,
  };
}
