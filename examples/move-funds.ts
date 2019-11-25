import * as zksync from "../src/index";
import { Contract, ethers, utils } from "ethers";
import { formatEther } from "ethers/utils";

const WEB3_URL = process.env.WEB3_URL;
// Mnemonic for eth wallet.
const MNEMONIC = process.env.MNEMONIC;
const TOKEN = process.env.TEST_ERC20;

function shortAddr(address: string): string {
    return `${address.substr(0, 6)}`;
}

async function logSyncBalance(
    wallet: zksync.Wallet,
    token: zksync.types.Token,
    type: "committed" | "verified" = "committed"
) {
    const balance = formatEther(await wallet.getBalance(token, type));
    console.log(
        `SYNC:${shortAddr(
            wallet.address()
        )} ${type} balance: ${balance} ${token}`
    );
}
async function logETHBalance(wallet: ethers.Wallet, token: zksync.types.Token) {
    const balance = await zksync.getEthereumBalance(wallet, token);

    console.log(
        `ETH:${shortAddr(wallet.address)} balance: ${balance} ${token}`
    );
}

(async () => {
    const ethersProvider = new ethers.providers.JsonRpcProvider(WEB3_URL);
    const syncProvider = await zksync.Provider.newWebsocketProvider();
    const ethProxy = new zksync.ETHProxy(ethersProvider, syncProvider.contractAddress);

    console.log("Contract address: ", syncProvider.contractAddress);

    const ethWallet = ethers.Wallet.fromMnemonic(
        MNEMONIC,
        "m/44'/60'/0'/0/1"
    ).connect(ethersProvider);
    const syncWallet = await zksync.Wallet.fromEthWallet(
        ethWallet,
        syncProvider,
        ethProxy
    );

    const ethWallet2 = ethers.Wallet.fromMnemonic(
        MNEMONIC,
        "m/44'/60'/0'/0/2"
    ).connect(ethersProvider);
    const syncWallet2 = await zksync.Wallet.fromEthWallet(
        ethWallet2,
        syncProvider,
        ethProxy
    );

    const depositAmount = "17.0";
    const depositToken = TOKEN;
    console.log("==================================");
    console.log(
        `Deposit: ${depositAmount} ${depositToken}: ETH:${shortAddr(
            ethWallet.address
        )} -> SYNC:${shortAddr(syncWallet.address())}`
    );
    await logETHBalance(ethWallet, depositToken);
    await logSyncBalance(syncWallet, depositToken, "verified");

    const depositHandle = await zksync.depositFromETH(
        ethWallet,
        syncWallet,
        depositToken,
        utils.parseEther(depositAmount),
        utils.parseEther("0.1")
    );
    await depositHandle.waitCommit();
    console.log("Deposit committed");

    await logETHBalance(ethWallet, depositToken);
    await logSyncBalance(syncWallet, depositToken, "committed");

    console.log("==================================");
    console.log(
        `Transfer: ${depositAmount} ${depositToken}: SYNC:${shortAddr(
            syncWallet.address()
        )} -> SYNC:${shortAddr(syncWallet2.address())}`
    );
    await logSyncBalance(syncWallet, depositToken, "committed");
    await logSyncBalance(syncWallet2, depositToken, "committed");

    const transferHandle = await syncWallet.syncTransfer(
        syncWallet2.address(),
        depositToken,
        utils.parseEther(depositAmount),
        0
    );
    await transferHandle.waitCommit();
    console.log("Transfer committed");

    await logSyncBalance(syncWallet, depositToken, "committed");
    await logSyncBalance(syncWallet2, depositToken, "committed");

    console.log("==================================");
    console.log(
        `Withdraw: ${depositAmount} ${depositToken}: SYNC:${shortAddr(
            syncWallet.address()
        )} -> ETH:${shortAddr(ethWallet2.address)}`
    );
    await logSyncBalance(syncWallet2, depositToken);
    await logETHBalance(ethWallet2, depositToken);

    const withdrawHandle = await syncWallet2.withdrawTo(
        ethWallet2.address,
        depositToken,
        ethers.utils.parseEther(depositAmount),
        0
    );
    await withdrawHandle.waitVerify();
    console.log("Withdraw committed");

    await logSyncBalance(syncWallet2, depositToken, "verified");
    await logETHBalance(ethWallet2, depositToken);

    await syncProvider.disconnect();
})();
