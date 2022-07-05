const { ethers, getNamedAccounts, network } = require('hardhat')
const { BigNumber } = require('@ethersproject/bignumber')
const { getWeth, AMOUNT } = require('../scripts/getWeth.js')
const { networkConfig } = require('../helper-hardhat-config')

async function main() {
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const lendingPool = await getLendingPool(deployer)
  console.log(`Lending pool address ${lendingPool.address}`)
  //     const wethTokenAddress = networkConfig[network.config.chainId].wethToken
  const wethTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
  console.log('Depositing WETH...')
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
  console.log('Desposited!')

  // Getting your borrowing stats
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  )
  const daiPrice = await getDaiPrice()

  // const amountDaiToBorrow =
  //   availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())

  const amountDaiToBorrow = '30'

  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  )

  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
  await borrowDai(
    //networkConfig[network.config.chainId].daiToken,
    daiAddress,
    lendingPool,
    amountDaiToBorrowWei,
    deployer
  )
  await getBorrowUserData(lendingPool, deployer)
  await repay(
    amountDaiToBorrowWei,
    networkConfig[network.config.chainId].daiToken,
    lendingPool,
    deployer
  )
  await getBorrowUserData(lendingPool, deployer)
  //
  async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log('Repaid!')
  }

  async function borrowDai(
    daiAddress,
    lendingPool,
    amountDaiToBorrow,
    account
  ) {
    const borrowTx = await lendingPool.borrow(
      daiAddress,
      amountDaiToBorrow,
      1,
      0,
      account
    )
    await borrowTx.wait(1)
    console.log("You've borrowed!")
  }

  async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
      'AggregatorV3Interface',
      //networkConfig[network.config.chainId].daiEthPriceFeed
      '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419'
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
  }

  async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt(
      'IERC20',
      erc20Address,
      signer
    )
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log('Approved!')
  }
  async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
      'ILendingPoolAddressesProvider',
      '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
      //networkConfig[network.config.chainId].lendingPoolAddressesProvider,
      account
    )
    const lendingPoolAddress =
      await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
      'ILendingPool',
      lendingPoolAddress,
      account
    )
    return lendingPool
  }
  async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
      await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
