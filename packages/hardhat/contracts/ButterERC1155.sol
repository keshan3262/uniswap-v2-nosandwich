pragma solidity =0.6.6;

import "./interfaces/IButterERC1155.sol";
import "./libraries/SafeMath.sol";
import "./ERC1155.sol";

contract ButterERC1155 is IButterERC1155, ERC1155Mintable {
	using SafeMath for uint;

	uint8 public constant decimals = 18;
	bytes32 public override DOMAIN_SEPARATOR;
	string public constant name = "ButterDex";
	constructor() public ERC1155Mintable() {
		uint chainId;
		assembly {
			chainId := chainid()
		}
		DOMAIN_SEPARATOR = keccak256(
			abi.encode(
				keccak256(
					"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
				),
				keccak256(bytes(name)),
				keccak256(bytes("1")),
				chainId,
				address(this)
			)
		);
	}

	function calculateNFTId(
		uint256 tickLimit,
		uint256 blockNumber
	) public view override returns (uint256) {
		// TODO: implement this
		return 0;
	}

	function mint(
		address to,
		uint256 tickLimit,
		uint256 value
	) external override {
		// TODO: implement this
		uint id = calculateNFTId(tickLimit, block.number);
		address[] memory recipients = new address[](1);
		recipients[0] = to;
		uint256[] memory values = new uint256[](1);
		values[0] = value;
		_mint(id, recipients, values);
	}
}
