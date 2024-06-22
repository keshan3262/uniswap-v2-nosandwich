pragma solidity >=0.5.0;

import "./IERC1155.sol";
interface IUniswapV2ERC1155 is IERC1155 {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, uint256 id, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}
