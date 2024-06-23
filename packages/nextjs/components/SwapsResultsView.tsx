import {
  /* useCallback, */
  useEffect,
  /* useMemo, */
  useRef,
  useState,
  /*, useState */
} from "react";
import BigNumber from "bignumber.js";
import {
  Chart,
  /* ChartData, */
  registerables,
} from "chart.js";
import { formatUnits } from "viem";
// import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { SimulationResult, SwapParams, SwapResult } from "~~/utils/math";

export interface SwapsResults {
  butterSwap: SimulationResult;
  uniSwap: SimulationResult;
  originalSwaps: SwapParams[];
}

interface SwapsResultsViewProps {
  results: SwapsResults;
}

export const SwapsResultsView = ({ results }: SwapsResultsViewProps) => {
  const { butterSwap, uniSwap, originalSwaps } = results;
  const illustrationCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(300);
  const { reserves: butterSwapReserves, swaps: butterSwapSwaps } = butterSwap;
  const { reserves: uniSwapReserves, swaps: uniSwapSwaps } = uniSwap;

  /* const [chartIndex, setChartIndex] = useState(0);
  const goToPrevChart = useCallback(() => setChartIndex(index => index - 1), []);
  const goToNextChart = useCallback(() => setChartIndex(index => index + 1), []); */

  useEffect(() => {
    Chart.register(...registerables);
    if (wrapperRef.current) {
      setCanvasSize(wrapperRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    if (!illustrationCanvasRef.current) {
      return;
    }

    const ctx = illustrationCanvasRef.current.getContext("2d");

    if (!ctx) {
      return;
    }

    const sortedSwapsData = [...originalSwaps]
      .map(({ amountIn, amountOut, tokenIn }) => {
        const formattedAmountIn = new BigNumber(amountIn.toString()).div(1e6).toNumber();
        const formattedAmountOut = new BigNumber(amountOut.toString()).div(1e6).toNumber();

        return {
          price: tokenIn === 0 ? formattedAmountIn / formattedAmountOut : formattedAmountOut / formattedAmountIn,
          amount: tokenIn === 0 ? formattedAmountIn : -formattedAmountOut,
        };
      })
      .sort((a, b) => a.price - b.price);
    const labels = [...new Set(sortedSwapsData.map(({ price }) => price.toString()))];
    const poolPrice = new BigNumber(butterSwapReserves[0].toString()).div(butterSwapReserves[1].toString()).toNumber();
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Buy",
            data: sortedSwapsData.map(({ amount }) => Math.max(amount, 0)),
            backgroundColor: "#34EEB6",
            stack: "stack",
          },
          {
            label: "Sell",
            data: sortedSwapsData.map(({ amount }) => Math.min(amount, 0)),
            backgroundColor: "#FF8863",
            stack: "stack",
          },
        ],
      },
      options: {
        scales: {
          x: { stacked: true },
          y: { stacked: true },
        },
        elements: {
          bar: { borderWidth: 1 },
          line: { borderWidth: 1 },
        },
        responsive: true,
      },
      plugins: [
        {
          id: "verticalLinePlugin",
          afterDatasetsDraw(chart) {
            try {
              console.log("oy vey 1", poolPrice);
              const xScale = chart.scales.x;
              const yScale = chart.scales.y;
              const closestLeftLabelIndex = labels.findLastIndex(label => Number(label) < poolPrice);
              const closestRightLabelIndex = labels.findIndex(label => Number(label) > poolPrice);
              let xValue: number;
              if (closestLeftLabelIndex >= 0 && closestRightLabelIndex >= 0) {
                const closestLeftX = Number(labels[closestLeftLabelIndex]);
                const closestRightX = Number(labels[closestRightLabelIndex]);
                xValue = closestLeftLabelIndex + (poolPrice - closestLeftX) / (closestRightX - closestLeftX);
              } else if (closestLeftLabelIndex >= 0) {
                xValue = labels.length - 0.6;
              } else {
                xValue = 0;
              }
              const x = xScale.getPixelForValue(xValue);
              chart.ctx.beginPath();
              chart.ctx.moveTo(x, yScale.bottom);
              chart.ctx.strokeStyle = "#ff0000";
              chart.ctx.lineTo(x, yScale.top);
              chart.ctx.stroke();
              const prevFillStyle = chart.ctx.fillStyle;
              chart.ctx.fillStyle = "#ff0000";
              const displayedPoolPrice = new BigNumber(poolPrice).precision(4).toFixed();
              const digitsCount = displayedPoolPrice.length - (displayedPoolPrice.includes(".") ? 1 : 0);
              const approximateWidth = 6.75 * digitsCount + (displayedPoolPrice.includes(".") ? 3 : 0);
              ctx.fillText(
                displayedPoolPrice,
                xValue < labels.length / 2 ? x + 4 : x - approximateWidth - 4,
                yScale.top + 16,
              );
              chart.ctx.fillStyle = prevFillStyle;
            } catch (error) {
              console.log(error);
            }
          },
        },
      ],
    });

    return () => chart.destroy();
  }, [butterSwapReserves, originalSwaps]);

  return (
    <>
      <p className="text-sm font-semibold m-0">Liquidity after swaps</p>
      <div className="w-full overflow-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Token</th>
              <th>ButterSwap</th>
              <th>Uniswap</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1].map(tokenIndex => (
              <tr key={tokenIndex}>
                <td>T{tokenIndex}</td>
                <td>{formatUnits(butterSwapReserves[tokenIndex], 6)}</td>
                <td>{formatUnits(uniSwapReserves[tokenIndex], 6)}</td>
                <td>{formatUnits(butterSwapReserves[tokenIndex] - uniSwapReserves[tokenIndex], 6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm font-semibold m-0">Swaps results</p>
      <div className="w-full overflow-auto">
        <table className="table table-zebra overflow-auto">
          <thead>
            <tr>
              <th>Input</th>
              <th>ButterSwap output</th>
              <th>Uniswap output</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {butterSwapSwaps.map((butterSwap, index) => (
              <SwapRow key={index} butterSwap={butterSwap} uniSwap={uniSwapSwaps[index]} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="w-full flex items-center justify-between">
        {/* <button className="btn btn-ghost" disabled={chartIndex === 0} onClick={goToPrevChart}>
          <ChevronLeftIcon className="h-5 w-5" />
        </button> */}
        <div className="bg-white w-full" ref={wrapperRef}>
          <canvas ref={illustrationCanvasRef} width={canvasSize} height={canvasSize} />
        </div>
        {/* <button className="btn btn-ghost" disabled={chartIndex === chartsData.length - 1} onClick={goToNextChart}>
          <ChevronRightIcon className="h-5 w-5" />
        </button> */}
      </div>
    </>
  );
};

interface SwapRowProps {
  butterSwap: SwapResult;
  uniSwap: SwapResult;
}

export const SwapRow = ({ butterSwap, uniSwap }: SwapRowProps) => {
  const { amountIn, tokenIn, amountOut: butterAmountOut } = butterSwap;
  const { amountOut: uniAmountOut } = uniSwap;
  const diff = butterAmountOut - uniAmountOut;
  const outputTokenSymbol = tokenIn === 0 ? "T1" : "T0";

  return (
    <tr>
      <td>
        {formatUnits(amountIn, 6)} T{tokenIn}
      </td>
      <td>
        {formatUnits(butterAmountOut, 6)} {outputTokenSymbol}
      </td>
      <td>
        {formatUnits(uniAmountOut, 6)} {outputTokenSymbol}
      </td>
      <td className={diff > 0n ? "text-success" : "text-error"}>
        {butterAmountOut > 0n && uniAmountOut > 0n ? `${formatUnits(diff, 6)} ${outputTokenSymbol}` : "-"}
      </td>
    </tr>
  );
};
