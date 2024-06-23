import { formatUnits } from "viem";
import { SimulationResult, SwapResult } from "~~/utils/math";

interface SwapsResults {
  butterSwap: SimulationResult;
  uniSwap: SimulationResult;
}

interface SwapsResultsViewProps {
  results: SwapsResults;
}

export const SwapsResultsView = ({ results }: SwapsResultsViewProps) => {
  const { reserves: butterSwapReserves, swaps: butterSwapSwaps } = results.butterSwap;
  const { reserves: uniSwapReserves, swaps: uniSwapSwaps } = results.uniSwap;

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
