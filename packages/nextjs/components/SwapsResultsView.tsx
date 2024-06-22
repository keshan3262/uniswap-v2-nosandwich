import { formatUnits } from "viem";
import { SimulationResult } from "~~/utils/math";

interface SwapsResultsViewProps {
  result: SimulationResult;
  dexName: string;
}

const precisionMultiplier = BigInt(10) ** BigInt(18);

export const SwapsResultsView = ({ result, dexName }: SwapsResultsViewProps) => (
  <>
    <p className="text-sm">Liquidity after swaps in {dexName}:</p>
    {result.reserves.map((reserve, index) => (
      <p key={index}>
        {reserve.toString()} {index === 0 ? "T0" : "T1"}
      </p>
    ))}

    <p className="text-sm">{dexName} swaps</p>
    <table className="table table-zebra overflow-x-auto">
      <thead>
        <tr>
          <th>Input</th>
          <th>Output</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {result.swaps.map(({ amountIn, amountOut, tokenIn }, index) => (
          <tr key={index}>
            <td>
              {amountIn.toString()} {tokenIn === 0 ? "T0" : "T1"}
            </td>
            <td>
              {amountOut.toString()} {tokenIn === 0 ? "T1" : "T0"}
            </td>
            <td>
              {formatUnits((amountOut * precisionMultiplier) / amountIn, 18)} {tokenIn === 0 ? "T1 / T0" : "T0 / T1"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);
