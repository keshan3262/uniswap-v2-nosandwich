pragma solidity >=0.5.0;

import "./IERC1155.sol";
interface IButterERC1155 is IERC1155 {
	function DOMAIN_SEPARATOR() external view returns (bytes32);
	// function PERMIT_TYPEHASH() external pure returns (bytes32);
	// function nonces(address owner) external view returns (uint);
	function calculateNFTId(
		uint256 blockNumber,
		uint256 tickLimit
	) external view returns (uint256);

	// function permit(
	// 	address owner,
	// 	uint256 id,
	// 	address spender,
	// 	uint value,
	// 	uint deadline,
	// 	uint8 v,
	// 	bytes32 r,
	// 	bytes32 s
	// ) external;

	function mint(address to, uint256 tickLimit, uint256 value) external;
}
