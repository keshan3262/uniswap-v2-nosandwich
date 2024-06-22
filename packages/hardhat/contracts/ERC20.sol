// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";

contract ERC20 is IERC20 {
	using SafeMath for uint256;
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(
		address indexed owner,
		address indexed spender,
		uint256 value
	);

	uint256 public override totalSupply;
	mapping(address => uint256) public override balanceOf;
	mapping(address => mapping(address => uint256)) public override allowance;
	string public override name;
	string public override symbol;
	uint8 public override decimals;

	constructor(
		string memory _name,
		string memory _symbol,
		uint8 _decimals
	) public {
		name = _name;
		symbol = _symbol;
		decimals = _decimals;
	}

	function transfer(
		address recipient,
		uint256 amount
	) external override returns (bool) {
		balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount);
		balanceOf[recipient] = balanceOf[recipient].add(amount);
		emit Transfer(msg.sender, recipient, amount);
		return true;
	}

	function approve(
		address spender,
		uint256 amount
	) external override returns (bool) {
		allowance[msg.sender][spender] = amount;
		emit Approval(msg.sender, spender, amount);
		return true;
	}

	function transferFrom(
		address sender,
		address recipient,
		uint256 amount
	) external override returns (bool) {
		allowance[sender][msg.sender] = allowance[sender][msg.sender].sub(
			amount
		);
		balanceOf[sender] = balanceOf[sender].sub(amount);
		balanceOf[recipient] = balanceOf[recipient].add(amount);
		emit Transfer(sender, recipient, amount);
		return true;
	}

	function _mint(address to, uint256 amount) internal {
		balanceOf[to] = balanceOf[to].add(amount);
		totalSupply = totalSupply.add(amount);
		emit Transfer(address(0), to, amount);
	}

	function _burn(address from, uint256 amount) internal {
		balanceOf[from] = balanceOf[from].sub(amount);
		totalSupply = totalSupply.sub(amount);
		emit Transfer(from, address(0), amount);
	}

	function mint(address to, uint256 amount) external {
		_mint(to, amount);
	}

	function burn(address from, uint256 amount) external {
		_burn(from, amount);
	}
}
