import { Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

//eventually write to json to preserve state
export function setMint(auth: Keypair, mint: Keypair, dec: number) {
    mintAuthority = auth;
    repMint = mint;
    decimals = dec;

    console.log("MINT AUTH SECRET: ", mintAuthority.secretKey);
    console.log("REP MINT SECRET: ", repMint.secretKey);
    console.log("Decimals: ", decimals);
}

export function createUsers(userOne: Keypair, userTwo: Keypair, userThree: Keypair) {
    user_one = userOne;
    user_two = userTwo;
    voter = userThree;

    console.log("User 1: ", user_one.secretKey);
    console.log("User 2: ", user_two.secretKey);
    console.log("User 3: ", voter.secretKey);
}

export function setDispute(id: anchor.BN) {
    disputeId = id;

    console.log("Dispute ID #: ", disputeId.toNumber().toString());
}

//Replace values with values wanting to test
export var mintAuthority: Keypair;
export var repMint: Keypair;
export var disputeId: anchor.BN;
export var decimals: number;

export var user_one: Keypair;
export var user_two: Keypair;
export var voter: Keypair;

//Change as needed
//users 1 and 2 interact and initcase, voter votes, all claim
export var user = user_two;