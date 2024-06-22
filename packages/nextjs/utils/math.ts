interface SwapParams {
  amountIn: bigint;
  amountOut: bigint;
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

interface SimulationResult {
  reserves: [bigint, bigint];
  swaps: SwapResult[];
}

export function getAmountOut(reserves: [bigint, bigint], amountIn: bigint, tokenIn: 0 | 1) {
  let reserveIn = reserves[tokenIn];
  let reserveOut = reserves[1 - tokenIn];

  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doUniSwapSimulation(reserves: [bigint, bigint], swaps: SwapParams[]): SimulationResult {
  let result: SwapResult[] = [];
  for (let swap of swaps) {
    if (swap.amountIn <= 0) {
      result.push({
        amountIn: swap.amountIn,
        amountOut: 0n,
        status: "failure",
        tokenIn: swap.tokenIn,
      });
      continue;
    }

    // let reserveIn = reserves[swap.tokenIn];
    // let reserveOut = reserves[1 - swap.tokenIn];

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

const infinity = Number.POSITIVE_INFINITY;
const precision = 1000000n;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doButterSwapSimulation(reserves: [bigint, bigint], swaps: SwapParams[]): SimulationResult {
  let result: SwapResult[] = [];
  let pendingSwaps: PendingSwapNFT[] = [];
  let ticksInfo: { [tick: number]: TickInfo } = {};
  let slot0 = {
    minTickSell: infinity,
    maxTickBuy: 0,
  };

  // STORE INTENDS
  for (let swap of swaps) {
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
      const minTick = 0;
      // console.log(swap.amountIn / swap.amountOut);
      const maxTick = priceToTick(Number(swap.amountIn) / Number(swap.amountOut));
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
      console.log(swap.amountOut / swap.amountIn);

      const minTick = priceToTick(Number(swap.amountOut) / Number(swap.amountIn));
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
  let currentTick = priceToTick(Number(reserves[0]) / Number(reserves[1]));
  let finalPriceTick: number = currentTick;
  // console.log(currentTick);
  const sortedTicks: number[] = Object.keys(ticksInfo)
    .map(tick => Number(tick))
    .sort((a, b) => (a > b ? 1 : -1));
  let currentReserves: [bigint, bigint] = [reserves[0], reserves[1]];
  // console.log(currentReserves);
  // console.log(slot0.maxTickBuy);

  while (currentTick < slot0.maxTickBuy) {
    const tickInfo = ticksInfo[slot0.maxTickBuy];
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
    // console.log(tickAfterSwap);

    if (tickAfterSwap < slot0.maxTickBuy) {
      finalPriceTick = tickAfterSwap;
      currentReserves = newReserves;
      // console.log(currentReserves);

      const nextTick = sortedTicks.reverse().find(tick => tick < slot0.maxTickBuy);
      // console.log(nextTick);
      if (nextTick === undefined) {
        break;
      }
      // console.log(slot0.maxTickBuy);
      // console.log(nextTick);
      slot0.maxTickBuy = nextTick;
    } else {
      break;
    }
  }
  // console.log(currentTick);
  // console.log(slot0.minTickSell);

  while (currentTick > slot0.minTickSell) {
    const tickInfo = ticksInfo[slot0.minTickSell];
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

    if (tickAfterSwap > slot0.minTickSell) {
      finalPriceTick = tickAfterSwap;
      currentReserves = newReserves;
      // console.log(currentReserves);

      const nextTick = sortedTicks.find(tick => tick > slot0.minTickSell);
      console.log(nextTick);
      if (nextTick === undefined) {
        break;
      }
      // console.log(slot0.minTickSell);
      // console.log(nextTick);
      slot0.minTickSell = nextTick;
    } else {
      break;
    }
  }
  // console.log(currentReserves);
  // console.log(sortedTicks);
  // console.log(finalPriceTick);
  const price = tickToPrice(finalPriceTick);
  // console.log(reserves);
  // console.log(currentReserves);
  const totalReserves0Diff = reserves[0] - currentReserves[0];
  const totalReserves1Diff = reserves[1] - currentReserves[1];
  // DISTRIBUTE
  const swapResult: SwapResult[] = [];
  for (let pendingSwap of pendingSwaps) {
    const { amountIn, tokenIn, maxTick, minTick } = pendingSwap;
    if (tokenIn === 0) {
      // If token0in was sent by user, then he receives token0in*reserves1diff /reserves0diff.
      const amountOut = (amountIn * totalReserves1Diff) / totalReserves0Diff;
      swapResult.push({
        amountIn: amountIn,
        amountOut: amountOut,
        status: "success",
        tokenIn: tokenIn,
      });
    } else {
      // If token1in was sent by user, then he receives token1in*reserves0diff /reserves1diff.
      const amountOut = (amountIn * totalReserves0Diff) / totalReserves1Diff;
      swapResult.push({
        amountIn: amountIn,
        amountOut: amountOut,
        status: "success",
        tokenIn: tokenIn,
      });
    }
  }
  // console.log("swapResult");
  // console.log(swapResult);
  return {
    reserves: currentReserves,
    swaps: swapResult,
  };
}

// console.log(doButterSwapSimulation([100n, 100n], [{ amountIn: 100n, tokenIn: 0, amountOut: 10n }]));
// console.log(
//   doButterSwapSimulation(
//     // [27304660873n, 10923529923371156n],
//     [17254660873n, 17266812360338870n],
//     [
//       { amountIn: 50000000n, tokenIn: 0, amountOut: 8n },
//       { amountIn: 10000000000n, tokenIn: 0, amountOut: 10000n },
//       { amountIn: 49741399943636n, tokenIn: 1, amountOut: 8n },
//       // { amountIn: 5n, tokenIn: 0, amountOut: 4n },
//       // { amountIn: 10n, tokenIn: 0, amountOut: 1n },
//     ],
//   ),
// );
// console.log(
//   doButterSwapSimulation(
//     [100n, 100n],
//     [
//       { amountIn: 10n, tokenIn: 0, amountOut: 8n },
//       { amountIn: 5n, tokenIn: 0, amountOut: 4n },
//       { amountIn: 10n, tokenIn: 0, amountOut: 1n },
//       { amountIn: 5n, tokenIn: 0, amountOut: 1n },
//       { amountIn: 12n, tokenIn: 1, amountOut: 8n },
//       { amountIn: 5n, tokenIn: 1, amountOut: 2n },
//       { amountIn: 8n, tokenIn: 1, amountOut: 1n },
//     ],
//   ),
// );
