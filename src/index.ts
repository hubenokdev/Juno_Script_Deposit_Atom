

//import { ibcWalletState, walletState } from './state/atoms/walletAtoms'
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice, SigningStargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

const RPC = "https://rpc.juno.giansalex.dev:443";

const coshub_RPC = "https://rpc.cosmos.network:443"
const uatomdenom = 'uatom'
const gas_token = 3000;

let wasmChainClient: SigningStargateClient = null
let addr_atom_wallet_for_juno: any = null;
let addr_atom_wallet_for_osmo: any = null;

let signingClient_for_juno: any = null;
let signingClient_for_osmo: any = null;

const addr_juno_recipient = 'juno1g0r0qdz6x0krgsg7vgvtruv7xrtpdah66fxshvxcchal3wtzq3ystr5jht';
const addr_osmo_recipient = 'osmo1czyqlaj5q4ug006veryuffaxj25jayzj7t9qs4yyssp4m9hjkhus37gnyl';

const config = {
  endpoint: RPC,
  cosbech32prefix: 'cosmos',
  atomDenom: uatomdenom,
  gasAPrice: GasPrice.fromString(`0.003${uatomdenom}`),
  //cos_mnemonic: 'end hover arrange occur riot inspire room bundle ten concert banana roast',
  cos_mnemonic_for_juno: 'portion salon meadow water wrong below sister attack need educate fabric actor staff festival pride cry essence gadget glory super mechanic turkey elder smooth',
  cos_mnemonic_for_osmo: 'portion salon meadow water wrong below sister attack need educate fabric actor staff festival pride cry essence gadget glory super mechanic turkey elder smooth',
};
console.log("start BOT");

async function main_coshub(addr_atom_wallet, signingClient, addr_recipient, sourceChannel, mnemonic) {
  const {atombalance} = await getAtomBalance(signingClient, addr_atom_wallet)
  console.log("cosmost - atom: " + atombalance)

  
  let tokenAmount: number = atombalance;

  tokenAmount -= gas_token

  if (tokenAmount <= 0) {
    return;
  }

  const timeout = Math.floor(new Date().getTime() / 1000) + 1600

  console.log("Sending " + tokenAmount + 'atom to ' + addr_recipient)

  return await wasmChainClient.sendIbcTokens(
    addr_atom_wallet,
    addr_recipient,
    {
      amount: tokenAmount.toString()
      // convertDenomToMicroDenom(
      //   tokenAmount,
      //   6, //tokenInfo.decimals
      // ).toString()
      ,

      denom: 'uatom' //tokenInfo.denom,
    },
    'transfer',
    sourceChannel, //juno channel
    //'channel-141', //osmosis channel
    undefined,
    timeout,
    'auto'
  )
}

async function setup_coshub(mnemonic) {

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: config.cosbech32prefix,
  });

  //console.log(wallet)
  // wallet
  // const aaa = await wallet.signDirect()

  const { address } = (await wallet.getAccounts())[0];
  const options = {
    prefix: config.cosbech32prefix,
    gasPrice: config.gasAPrice,
  };

  const client = await SigningCosmWasmClient.connectWithSigner(
    coshub_RPC,
    wallet,
    options
  );

  wasmChainClient = await SigningStargateClient.connectWithSigner(
    'https://rpc.cosmos.directory:443/cosmoshub',
    wallet,
    {
      gasPrice: config.gasAPrice,
    }
  )

  //addr_atom_wallet = address;
  console.log("address: " + address)
  return { address, client };
}

//const { address, client } = await setup_coshub();

async function getAtomBalance(signingClient, addr_atom_wallet) {
  const { denom, amount } = await signingClient.getBalance(addr_atom_wallet, config.atomDenom);
  return { atombalance: amount }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main () {
  let { address : addr_atom_wallet_for_juno, client: signingClient_for_juno} = await setup_coshub(config.cos_mnemonic_for_juno)
  let { address: addr_atom_wallet_for_osmo, client: signingClient_for_osmo} = await setup_coshub(config.cos_mnemonic_for_osmo)

  while (true) 
  {
    console.log("======================================")
    try {
        await main_coshub(addr_atom_wallet_for_juno, signingClient_for_juno, addr_juno_recipient, 'channel-207', config.cos_mnemonic_for_juno);
        await main_coshub(addr_atom_wallet_for_osmo, signingClient_for_osmo, addr_osmo_recipient, 'channel-141', config.cos_mnemonic_for_osmo);
    } catch (error) {
        console.log(error)
    }
    console.log("====>    Waiting 1min")
    await sleep(6000) 
  }  
}

main();

export function convertDenomToMicroDenom(
  value: number | string,
  decimals: number
): number {
  if (decimals === 0) return Number(value)

  return protectAgainstNaN(
    parseInt(String(Number(value) * Math.pow(10, decimals)), 10)
  )
}
export const protectAgainstNaN = (value: number) => (isNaN(value) ? 0 : value)

export type TransactionKind = 'deposit' | 'withdraw'
export type TransactionOrigin = 'platform' | 'wallet'
export type TransactionType = 'incoming' | 'outgoing'



