pragma solidity =0.6.6;

import './interfaces/IButterERC1155.sol';
import './libraries/SafeMath.sol';
import './ERC1155.sol';

abstract contract ButterERC1155 is IButterERC1155, ERC1155Mintable {
    using SafeMath for uint;

    uint8 public constant decimals = 18;
    bytes32 public override DOMAIN_SEPARATOR;
    string public constant name = 'Uniswap V2 Sandwich';
    constructor() public {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }
}
