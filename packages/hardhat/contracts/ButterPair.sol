pragma solidity =0.6.6;

import "./interfaces/IButterPair.sol";
import "./ButterERC20.sol";
import "./libraries/Math.sol";
import "./libraries/UQ112x112.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IButterFactory.sol";
import "./interfaces/IButterCallee.sol";
import "./interfaces/IButterERC1155.sol";

import "./libraries/LowGasSafeMath.sol";
import "./libraries/SafeCast.sol";
import "./libraries/Tick.sol";
import "./libraries/TickBitmap.sol";

import "./ButterERC1155.sol";

contract ButterPair is IButterPair, ButterERC20 {
	using SafeMath for uint;
	using UQ112x112 for uint224;

	using Tick for mapping(int24 => Tick.Info);
	using TickBitmap for mapping(int16 => uint256);

	uint public constant override MINIMUM_LIQUIDITY = 10 ** 3;
	bytes4 private constant SELECTOR =
		bytes4(keccak256(bytes("transfer(address,uint256)")));

	address public override factory;
	address public override token0;
	address public override token1;

	IButterERC1155 public token0SwapShare;
	IButterERC1155 public token1SwapShare;

	uint112 private reserve0; // uses single storage slot, accessible via getReserves
	uint112 private reserve1; // uses single storage slot, accessible via getReserves
	uint112 private pendingReserve0; // uses single storage slot, accessible via getReserves
	uint112 private pendingReserve1; // uses single storage slot, accessible via getReserves
	uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves

	uint public override price0CumulativeLast;
	uint public override price1CumulativeLast;
	uint public override kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

	struct Slot0 {
		uint160 lastBlock;
		int24 lastSellTick;
		int24 lastBuyTick;
	}

	int24 public immutable tickSpacing = 10; // TODO: set on deployment
	Slot0 public slot0;

	mapping(int24 => Tick.Info) public ticks;
	mapping(int16 => uint256) public tickBitmap;

	uint private unlocked = 1;
	modifier lock() {
		require(unlocked == 1, "Butter: LOCKED");
		unlocked = 0;
		_;
		unlocked = 1;
	}

	function getReserves()
		public
		view
		override
		returns (
			uint112 _reserve0,
			uint112 _reserve1,
			uint112 _pendingReserve0,
			uint112 _pendingReserve1,
			uint32 _blockTimestampLast
		)
	{
		_reserve0 = reserve0;
		_reserve1 = reserve1;
		_pendingReserve0 = pendingReserve0;
		_pendingReserve1 = pendingReserve1;
		_blockTimestampLast = blockTimestampLast;
	}

	function _safeTransfer(address token, address to, uint value) private {
		(bool success, bytes memory data) = token.call(
			abi.encodeWithSelector(SELECTOR, to, value)
		);
		require(
			success && (data.length == 0 || abi.decode(data, (bool))),
			"Butter: TRANSFER_FAILED"
		);
	}

	event Mint(address indexed sender, uint amount0, uint amount1);
	event Burn(
		address indexed sender,
		uint amount0,
		uint amount1,
		address indexed to
	);
	event Swap(
		address indexed sender,
		uint amount0In,
		uint amount1In,
		uint amount0Out,
		uint amount1Out,
		address indexed to
	);
	event SwapIntention(
		address indexed sender,
		uint amount0In,
		uint amount1In,
		address indexed to
	);
	event Sync(uint112 reserve0, uint112 reserve1);

	constructor() public {
		factory = msg.sender;
		// token0SwapShare = new ButterERC1155(address(this), token0);
		// token1SwapShare = new ButterERC1155(address(this), token1);
	}

	// called once by the factory at time of deployment
	function initialize(address _token0, address _token1) external override {
		require(msg.sender == factory, "Butter: FORBIDDEN"); // sufficient check
		token0 = _token0;
		token1 = _token1;
	}

	function _doClearing() private {}

	// update reserves and, on the first call per block, price accumulators
	function _update(
		uint balance0,
		uint balance1,
		uint112 _reserve0,
		uint112 _reserve1,
		uint112 _pendingReserve0,
		uint112 _pendingReserve1
	) private {
		require(
			balance0 <= uint112(-1) && balance1 <= uint112(-1),
			"Butter: OVERFLOW"
		);
		uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
		uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
		if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
			// * never overflows, and + overflow is desired
			price0CumulativeLast +=
				uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) *
				timeElapsed;
			price1CumulativeLast +=
				uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) *
				timeElapsed;
		}
		reserve0 = uint112(balance0);
		reserve1 = uint112(balance1);
		pendingReserve0 = uint112(_pendingReserve0);
		pendingReserve1 = uint112(_pendingReserve1);
		blockTimestampLast = blockTimestamp;
		emit Sync(reserve0, reserve1);
	}

	// this low-level function should be called from a contract which performs important safety checks
	function mint(address to) external override lock returns (uint liquidity) {
		(
			uint112 _reserve0,
			uint112 _reserve1,
			uint112 _pendingReserve0,
			uint112 _pendingReserve1,

		) = getReserves(); // gas savings
		uint balance0 = IERC20(token0).balanceOf(address(this));
		uint balance1 = IERC20(token1).balanceOf(address(this));
		uint amount0 = balance0.sub(_reserve0);
		uint amount1 = balance1.sub(_reserve1);
		uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
		if (_totalSupply == 0) {
			liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
			_mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
		} else {
			liquidity = Math.min(
				amount0.mul(_totalSupply) / _reserve0,
				amount1.mul(_totalSupply) / _reserve1
			);
		}
		require(liquidity > 0, "Butter: INSUFFICIENT_LIQUIDITY_MINTED");
		_mint(to, liquidity);

		_update(
			balance0,
			balance1,
			_reserve0,
			_reserve1,
			_pendingReserve0,
			_pendingReserve1
		);
		emit Mint(msg.sender, amount0, amount1);
	}

	// this low-level function should be called from a contract which performs important safety checks
	function burn(
		address to
	) external override lock returns (uint amount0, uint amount1) {
		(
			uint112 _reserve0,
			uint112 _reserve1,
			uint112 _pendingReserve0,
			uint112 _pendingReserve1,

		) = getReserves(); // gas savings
		address _token0 = token0; // gas savings
		address _token1 = token1; // gas savings
		uint balance0 = IERC20(_token0).balanceOf(address(this));
		uint balance1 = IERC20(_token1).balanceOf(address(this));
		uint liquidity = balanceOf[address(this)];

		uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
		amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
		amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
		require(
			amount0 > 0 && amount1 > 0,
			"Butter: INSUFFICIENT_LIQUIDITY_BURNED"
		);
		_burn(address(this), liquidity);
		_safeTransfer(_token0, to, amount0);
		_safeTransfer(_token1, to, amount1);
		balance0 = IERC20(_token0).balanceOf(address(this));
		balance1 = IERC20(_token1).balanceOf(address(this));

		_update(
			balance0,
			balance1,
			_reserve0,
			_reserve1,
			_pendingReserve0,
			_pendingReserve1
		);
		emit Burn(msg.sender, amount0, amount1, to);
	}

	// this low-level function should be called from a contract which performs important safety checks
	function swap(
		uint amount0OutLimit,
		uint amount1OutLimit,
		address to,
		bytes calldata data
	) external override lock {
		require(
			amount0OutLimit > 0 || amount1OutLimit > 0,
			"Butter: INSUFFICIENT_OUTPUT_AMOUNT"
		);
		require(
			!(amount0OutLimit > 0 && amount1OutLimit > 0),
			"Butter: INVALID_OUTPUT_AMOUNT"
		);

		_doClearing();

		(
			uint112 _reserve0,
			uint112 _reserve1,
			uint112 _pendingReserve0,
			uint112 _pendingReserve1,

		) = getReserves(); // gas savings

		uint balance0;
		uint balance1;
		{
			// scope for _token{0,1}, avoids stack too deep errors
			address _token0 = token0;
			address _token1 = token1;
			require(to != _token0 && to != _token1, "Butter: INVALID_TO");
			balance0 = IERC20(_token0).balanceOf(address(this));
			balance1 = IERC20(_token1).balanceOf(address(this));
		}
		uint amount0In = balance0 > _reserve0 + _pendingReserve0
			? balance0 - (_reserve0 + _pendingReserve0)
			: 0;
		uint amount1In = balance1 > _reserve1 + _pendingReserve1
			? balance1 - (_reserve1 + _pendingReserve1)
			: 0;
		require(
			amount0In <= uint112(-1) && amount1In <= uint112(-1),
			"Butter: OVERFLOW"
		);

		_pendingReserve0 = _pendingReserve0 + uint112(amount0In);
		_pendingReserve1 = _pendingReserve1 + uint112(amount1In);
		require(
			amount0In > 0 || amount1In > 0,
			"Butter: INSUFFICIENT_INPUT_AMOUNT"
		);
		require(
			!(amount0In > 0 && amount1In > 0),
			"Butter: INVALID_INPUT_AMOUNT"
		);

		if (amount0In > 0) {
			token0SwapShare.mint(to, 0, amount0In);
		}
		if (amount1In > 0) {
			token1SwapShare.mint(to, 0, amount1In);
		}

		_update(
			balance0,
			balance1,
			_reserve0,
			_reserve1,
			_pendingReserve0,
			_pendingReserve1
		);
		emit SwapIntention(msg.sender, amount0In, amount1In, to);
	}

	// function swap(
	// 	uint amount0Out,
	// 	uint amount1Out,
	// 	address to,
	// 	bytes calldata data
	// ) external override lock {
	// 	require(
	// 		amount0Out > 0 || amount1Out > 0,
	// 		"Butter: INSUFFICIENT_OUTPUT_AMOUNT"
	// 	);
	// 	require(
	// 		!(amount0Out > 0 && amount1Out > 0),
	// 		"Butter: INVALID_OUTPUT_AMOUNT"
	// 	);

	// 	_doClearing();

	// 	(uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
	// 	require(
	// 		amount0Out < _reserve0 && amount1Out < _reserve1,
	// 		"Butter: INSUFFICIENT_LIQUIDITY"
	// 	);

	// 	uint balance0;
	// 	uint balance1;
	// 	{
	// 		// scope for _token{0,1}, avoids stack too deep errors
	// 		address _token0 = token0;
	// 		address _token1 = token1;
	// 		require(to != _token0 && to != _token1, "Butter: INVALID_TO");
	// 		if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
	// 		if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
	// 		if (data.length > 0)
	// 			IButterCallee(to).uniswapV2Call(
	// 				msg.sender,
	// 				amount0Out,
	// 				amount1Out,
	// 				data
	// 			);
	// 		balance0 = IERC20(_token0).balanceOf(address(this));
	// 		balance1 = IERC20(_token1).balanceOf(address(this));
	// 	}
	// 	uint amount0In = balance0 > _reserve0 - amount0Out
	// 		? balance0 - (_reserve0 - amount0Out)
	// 		: 0;
	// 	uint amount1In = balance1 > _reserve1 - amount1Out
	// 		? balance1 - (_reserve1 - amount1Out)
	// 		: 0;
	// 	require(
	// 		amount0In > 0 || amount1In > 0,
	// 		"Butter: INSUFFICIENT_INPUT_AMOUNT"
	// 	);
	// 	{
	// 		// scope for reserve{0,1}Adjusted, avoids stack too deep errors
	// 		uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
	// 		uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
	// 		require(
	// 			balance0Adjusted.mul(balance1Adjusted) >=
	// 				uint(_reserve0).mul(_reserve1).mul(1000 ** 2),
	// 			"Butter: K"
	// 		);
	// 	}

	// 	_update(balance0, balance1, _reserve0, _reserve1);
	// 	emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
	// }

	// force balances to match reserves
	function skim(address to) external override lock {
		address _token0 = token0; // gas savings
		address _token1 = token1; // gas savings
		_safeTransfer(
			_token0,
			to,
			IERC20(_token0).balanceOf(address(this)).sub(reserve0)
		);
		_safeTransfer(
			_token1,
			to,
			IERC20(_token1).balanceOf(address(this)).sub(reserve1)
		);
	}

	// force reserves to match balances
	function sync() external override lock {
		_update(
			IERC20(token0).balanceOf(address(this)),
			IERC20(token1).balanceOf(address(this)),
			reserve0,
			reserve1,
			pendingReserve0,
			pendingReserve1
		);
	}
}
