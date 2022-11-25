import Web3 from "web3";
const SkateABI = require("./abis/SkateContract");


console.log("start BOT");

import { useRecoilValue } from 'recoil'

//import { ibcWalletState, walletState } from './state/atoms/walletAtoms'
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice, SigningStargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { useMutation } from 'react-query'
//import { useCallback, useMemo } from 'react'
const RPC = "https://rpc.juno.giansalex.dev:443";

const coshub_RPC = "https://rpc.cosmos.network:443"
const uatomdenom = 'uatom'

let wasmChainClient: SigningStargateClient = null
let addr_atom_wallet: any = null;
let signingClient: any = null;

//let addr_juno_wallet = 'juno15tl3jjhmf9tl2k6qkgfs3ky4lk9rfrkzahd0a5';
const addr_juno_wallet = 'juno1g0r0qdz6x0krgsg7vgvtruv7xrtpdah66fxshvxcchal3wtzq3ystr5jht';

const config = {
  endpoint: RPC,
  cosbech32prefix: 'cosmos',
  atomDenom: uatomdenom,
  gasAPrice: GasPrice.fromString(`0.003${uatomdenom}`),
  //cos_mnemonic: 'end hover arrange occur riot inspire room bundle ten concert banana roast',
  cos_mnemonic: 'portion salon meadow water wrong below sister attack need educate fabric actor staff festival pride cry essence gadget glory super mechanic turkey elder smooth',
};


async function main_coshub() {
  await setup_coshub()
  const {atombalance} = await getAtomBalance()
  console.log("cosmost - atom: " + atombalance)

  
  let tokenAmount: number = atombalance;

  tokenAmount -= 3000

  if (tokenAmount <= 0) {
    return;
  }

  const timeout = Math.floor(new Date().getTime() / 1000) + 1600

  console.log("Sending " + tokenAmount + 'atom to ' + addr_juno_wallet)

  return await wasmChainClient.sendIbcTokens(
    addr_atom_wallet,
    addr_juno_wallet,
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
    'channel-207', //tokenInfo.channel,
    undefined,
    timeout,
    'auto'
  )

}


async function setup_coshub() {

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.cos_mnemonic, {
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

  addr_atom_wallet = address;
  signingClient = client;
  console.log("address: " + addr_atom_wallet)
  return { address, client };
}

//const { address, client } = await setup_coshub();

async function getAtomBalance() {
  const { denom, amount } = await signingClient.getBalance(addr_atom_wallet, config.atomDenom);
  return { atombalance: amount }
}

async function main () {
  //while (true) 
  {
    console.log("======================================")
    try {
        await main_coshub();
    } catch (error) {
        console.log(error)
    }
    console.log("====>    Waiting 1min")
    //await sleep(60000) 
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



