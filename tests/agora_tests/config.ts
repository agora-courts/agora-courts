import { Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';

const fileName = __dirname + '/keys.json';

//SET CORRECT USER FOR TESTS IN THE LAST FUNCTION

interface Config {
  mintAuthSecret: Uint8Array,
  repMintSecret: Uint8Array,
  disputeId: string, //BN toJSON()
  decimals: number,
  userOneSecret: Uint8Array,
  userTwoSecret: Uint8Array,
  voterSecret: Uint8Array
}

export function setMint(auth: Keypair, mint: Keypair, dec: number) {
    console.log("MINT AUTH SECRET: ", auth.secretKey);
    console.log("REP MINT SECRET: ", mint.secretKey);
    console.log("Decimals: ", dec);

    const configContents = fs.readFileSync(fileName, 'utf8');

    const config: Config = JSON.parse(configContents);
    config.mintAuthSecret = auth.secretKey;
    config.repMintSecret = mint.secretKey;
    config.decimals = dec;

    fs.writeFileSync(fileName, JSON.stringify(config, null, 2));
}

export function createUsers(userOne: Keypair, userTwo: Keypair, userThree: Keypair) {
    console.log("User 1: ", userOne.secretKey);
    console.log("User 2: ", userTwo.secretKey);
    console.log("User 3: ", userThree.secretKey);

    const configContents = fs.readFileSync(fileName, 'utf8');

    const config: Config = JSON.parse(configContents);
    config.userOneSecret = userOne.secretKey;
    config.userTwoSecret = userTwo.secretKey;
    config.voterSecret = userThree.secretKey;

    fs.writeFileSync(fileName, JSON.stringify(config, null, 2));
}

export function setDispute(id: anchor.BN) {
    console.log("Dispute ID #: ", id.toNumber().toString());

    const configContents = fs.readFileSync(fileName, 'utf8');

    const config: Config = JSON.parse(configContents);
    config.disputeId = id.toJSON();

    fs.writeFileSync(fileName, JSON.stringify(config, null, 2));
}

export function getMintInfo(): [Keypair, Keypair, number] {
  const configContents = fs.readFileSync(fileName, 'utf8');
  const config: Config = JSON.parse(configContents);

  let mintAuthority = Keypair.fromSecretKey(config.mintAuthSecret);
  let repMint = Keypair.fromSecretKey(config.repMintSecret);
  let decimals = config.decimals;

  return [mintAuthority, repMint, decimals];
}

export function getDisputeID(): anchor.BN {
  const configContents = fs.readFileSync(fileName, 'utf8');
  const config: Config = JSON.parse(configContents);

  let id = new anchor.BN(config.disputeId);

  return id;
}

export function getUsers(): [Keypair, Keypair, Keypair] {
  const configContents = fs.readFileSync(fileName, 'utf8');
  const config: Config = JSON.parse(configContents);

  let userOne = Keypair.fromSecretKey(config.userOneSecret);
  let userTwo = Keypair.fromSecretKey(config.userTwoSecret);
  let voter = Keypair.fromSecretKey(config.voterSecret);

  return [userOne, userTwo, voter];
}

export function getSingleUser(): Keypair {
  let [userOne, userTwo, voter] = getUsers();

  return userTwo; //CHANGE THIS AS NECESSARY FOR TESTING
}