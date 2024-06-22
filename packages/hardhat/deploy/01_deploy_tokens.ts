import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Token, WrappedNativeToken } from "../typechain-types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTokens: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("WrappedNativeToken", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const weth = await hre.ethers.getContract<WrappedNativeToken>("WrappedNativeToken", deployer);
  console.log("👋 WETH:", await weth.getAddress());

  await deploy("Token", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const token = await hre.ethers.getContract<Token>("Token", deployer);
  console.log("👋 Token:", await token.getAddress());

  await deploy("ERC20", {
    from: deployer,
    args: ["Name", "Symbol", 18],
    log: true,
    autoMine: true,
  });
};

export default deployTokens;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployTokens.tags = ["Tokens"];
