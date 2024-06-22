import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ButterFactory, WrappedNativeToken, ButterRouter02 } from "../typechain-types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployRouter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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

  const factory = await hre.ethers.getContract<ButterFactory>("ButterFactory", deployer);
  const weth = await hre.ethers.getContract<WrappedNativeToken>("WrappedNativeToken", deployer);
  // Get the deployed contract to interact with it after deploying.
  await deploy("ButterRouter02", {
    from: deployer,
    args: [await factory.getAddress(), await weth.getAddress()],
    log: true,
    autoMine: true,
  });

  const router = await hre.ethers.getContract<ButterRouter02>("ButterRouter02", deployer);
  console.log("👋 Router deployed:", await router.getAddress());
};

export default deployRouter;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployRouter.tags = ["UnifapV2Router"];
