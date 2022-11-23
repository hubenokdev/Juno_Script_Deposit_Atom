import { StargateClient, setupGovExtension, QueryClient } from "@cosmjs/stargate"
import { Tendermint34Client } from "@cosmjs/tendermint-rpc"

import * as fs from "fs"
import { toBase64, toUtf8 } from '@cosmjs/encoding';
import axios from 'axios';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { history } from './history.js'
import moment from 'moment'


//const RPC = "https://rpc.junomint.com:443";
const RPC = "https://rpc.juno.giansalex.dev:443";

const coshub_RPC = "https://rpc.cosmos.network:443"
const junodenom='ujuno'
const uatomdenom='uatom'
const ustdenom='ibc/2DA4136457810BCB9DAAB620CA67BC342B17C3C70151CA70490A170DF7C9CB27'
const ibc_atomdenom='ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9'

const swapfee=1250
const MUL=1000000

const config = {
    endpoint: RPC,
    cosbech32prefix: 'cosmos',
    bech32prefix: 'juno',
    atomDenom: uatomdenom,
    junoDenom: junodenom,
    ustDenom: ustdenom,
    gasPrice: GasPrice.fromString(`0.003${junodenom}`),
    gasAPrice: GasPrice.fromString(`0.003${uatomdenom}`),
    cos_mnemonic: 'end hover arrange occur riot inspire room bundle ten concert banana roast',
    mnemonic: 'chief brave canoe trophy someone write coin marble favorite cattle ancient garbage cactus now buzz tackle habit health ensure slender weasel rib render apart',
};

async function setup_coshub() {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.cos_mnemonic, {
        prefix: config.cosbech32prefix,
    });
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

    // // now ensure there is a balance
    // console.log(`Querying balance of ${address}`);
    // const {denom, amount} = await client.getBalance(address, config.junoDenom);
    // console.log(`Got ${amount} ${denom}`);
    // if (!amount || amount === "0") {
    //     console.log('Please add tokens to your account before uploading')
    // }
  
    return { address, client };
}

// 1425841856
async function setup() {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.mnemonic, {
        prefix: config.bech32prefix,
    });
    const { address } = (await wallet.getAccounts())[0];
    const options = {
        prefix: config.bech32prefix,
        gasPrice: config.gasPrice,
    };
    const client = await SigningCosmWasmClient.connectWithSigner(
        config.endpoint,
        wallet,
        options
    );

    // // now ensure there is a balance
    // console.log(`Querying balance of ${address}`);
    // const {denom, amount} = await client.getBalance(address, config.junoDenom);
    // console.log(`Got ${amount} ${denom}`);
    // if (!amount || amount === "0") {
    //     console.log('Please add tokens to your account before uploading')
    // }
  
    return { address, client };
}


const { address, client } = await setup_coshub();
//const { address, client } = await setup();
const poolAddr = "juno1hue3dnrtgf9ly2frnnvf8z5u7e224ctc4hk7wks2xumeu3arj6rs9vgzec";

async function getAtomBalance() {
    const {denom, amount} = await client.getBalance(address, config.atomDenom);
    return {atombalance: amount}
}

async function getJunoBalance() {
    const {denom, amount} = await client.getBalance(address, config.junoDenom);
    return {junobalance: amount}
}

async function getUSTBalance() {
    const {denom, amount} = await client.getBalance(address, config.ustDenom);
    return {ustbalance: amount}
}

async function getJuno2USTPrice() {
    let ret = await client.queryContractSmart(
        poolAddr,
        { token1_for_token2_price: { token1_amount: `${MUL}` } }
    );
    return {juno2ustprice: ret.token2_amount}
}

async function getUST2JunoPrice() {
    let ret = await client.queryContractSmart(
        poolAddr,
        { token2_for_token1_price: { token2_amount: `${MUL}` } }
    );
    return {ust2junoprice: ret.token1_amount}
}


async function swapUST2Juno(ustamount, junoamount) {
    await client.execute(
        address,
        poolAddr,
        { 
            swap: {
                input_token: `Token2`,
                input_amount: `${ustamount}`,
                min_output: `${junoamount}`
            }
        },
        'auto',
        '',
        [
            {
                "denom": config.ustDenom,
                "amount": `${ustamount}`
            }
        ]
    );
    console.log("successfully swapped UST to Juno.")
    
}
async function swapJuno2UST(junoamount, ustamount) {
    console.log("junoamount: " + junoamount)
    console.log("ustamount: " + ustamount)
    await client.execute(
        address,
        poolAddr,
        { 
            swap: {
                input_token: `Token1`,
                input_amount: `${junoamount}`,
                min_output: `${ustamount}`
            }
        },
        'auto',
        '',
        [
            {
                "denom": config.junoDenom,
                "amount": `${junoamount}`
            }
        ]
    );
    console.log("successfully swapped JUNO to UST.")
    
}

async function getCoinGekoPrice() {
    let prices = await axios.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=1000&page=1&sparkline=false");
    let junoprice = 0.0;
    for (let i = 0; i < prices.data.length; i ++) {
        if (prices.data[i].symbol == "juno") {
            // console.log(prices.data[i])
            junoprice = prices.data[i].current_price
        }
    }
    
    return {coingekoprice: junoprice}
}

function EMACalc(mArray,mRange) {
    var k = 2/(mRange + 1);
    // first item is just the same as the first item in the input
    let emaArray = [mArray[0]];
    // for the rest of the items, they are computed with the previous one
    for (var i = 1; i < mArray.length; i++) {
        emaArray.push(mArray[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}

function appendSwapLog(mode, price, ustvalue) {
    let str = `${moment(new Date()).format('YYYY/MM/DD HH:mm:ss')}\t${mode}\t${price}\t${ustvalue}\n`

    fs.appendFile('swaplog.txt', str, function (err) {
        if (err) throw err;
    });
    fs.appendFile('/var/www/html/swaplog.txt', str, function (err) {
        if (err) throw err;
    });
}

async function main_coshub() {
    const {atombalance} = await getAtomBalance()
    console.log("cosmost - atom: " + atombalance)

    if (atombalance > 0) {
        
    }
}

async function main() {
    const {junobalance} = await getJunoBalance()
    console.log("junobalance: " + junobalance)
    
    // const {juno2ustprice} = await getJuno2USTPrice()
    // const {ust2junoprice} = await getUST2JunoPrice()
    // const {coingekoprice} = await getCoinGekoPrice()
    // const {junobalance} = await getJunoBalance()
    // const {ustbalance} = await getUSTBalance()
    // const junobalanceinust = Math.round(junobalance / MUL * juno2ustprice * MUL) / MUL / MUL
    // const date = Math.round(new Date().getTime() / 1000);

    
    // // console.log("CoinGeko price: " + coingekoprice)
    // // console.log("Juno2UST Price for 1Juno: " + juno2ustprice)
    // // console.log("UST2Juno Price for 1UST: " + ust2junoprice)
    // console.log("Juno Balance: " + junobalance)
    // console.log("UST Balance: " + ustbalance)
    // // console.log("Juno amount in UST: " + junobalanceinust)
    // history.push({
    //     date: Number(date), 
    //     price: Number(juno2ustprice),
    //     // junobalance: Number(junobalance),
    //     // ustbalance: Number(ustbalance),
    //     // junobalanceinust: Number(junobalanceinust)
    // })

    // let max = -1;
    // let min = -1;
    // for (let i = 0; i < history.length; i ++) {
    //     if (history[i].price == undefined)
    //         continue;
    //     max = (max == -1 ? history[i].price : max < history[i].price ? history[i].price : max)
    //     min = (min == -1 ? history[i].price : min > history[i].price ? history[i].price : min)
    // }
    // let expMax, expMin;
    // let threshold = 0.8;
    // let minjuno = 10000;
    // let slip = 1.00003 * 1.0001;

    // expMax = min + (max - min) * threshold;
    // expMin = min + (max - min) * (1.0 - threshold);
    // console.log("expMax: " + expMax)
    // console.log("expMin: " + expMin)
    // console.log("current Price: " + juno2ustprice)
    // let swapstate = ""
    // if (expMax > 0 && expMin > 0 && expMax - expMin > 100000) { // bigger than 0.1$
    //     if (juno2ustprice > expMax) {
    //         if (ustbalance > 0) {
    //             //Already swapped into UST, fuck
    //         } else {
    //             //Swap into UST
    //             await swapJuno2UST(junobalance - minjuno, Math.floor(juno2ustprice * (junobalance - minjuno) / slip / MUL))
    //             swapstate = "juno2ust"
    //         }
    //     } else if (juno2ustprice < expMin) {
    //         if (ustbalance > 0) {
    //             //Swap into Juno
    //             await swapUST2Juno(ustbalance, Math.floor(ust2junoprice * ustbalance / slip / MUL))
    //             swapstate = "ust2juno"
    //         } else {
    //             //Already swapped into Juno, fuck
    //         }
    //     }
    // }
    // if (swapstate != "") 
    // {
    //     const {junobalance} = await getJunoBalance()
    //     const {ustbalance} = await getUSTBalance()
    //     const junobalanceinust = Math.round(junobalance / MUL * juno2ustprice) / MUL
        
    //     appendSwapLog(swapstate, juno2ustprice, ustbalance / MUL + junobalanceinust)
    // }


    // while (history.length > 60 * 24 * 30)
    //     history.shift()

    // try {
    //     fs.writeFileSync(`history.js`, "export const history = " + JSON.stringify(history))
    // } catch (err) {
    //     console.error(err)
    // }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

while (true) {
    console.log("======================================")
    try {
        //await main();
        await main_coshub();
    } catch (error) {
        console.log(error)
    }
    console.log("====>    Waiting 1min")
    await sleep(60000) 
}