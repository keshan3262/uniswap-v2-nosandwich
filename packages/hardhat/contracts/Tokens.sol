pragma solidity ^0.6.0;

import "./ERC20.sol";
import "./WETH.sol";


contract Token is ERC20("ButterDX", "BDX", 18) {
    constructor() public {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}

contract WrappedNativeToken is WETH9_ {
}