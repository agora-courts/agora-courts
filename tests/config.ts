import * as anchor from "@coral-xyz/anchor";
import { DisputeOptions } from "./court-suite";

//Court Config
export const courtName = "VarunCourt";
export const maxDisputeVotes = 200;
export const decimals = 9;
const LAMPORTS_PER_MINT = Math.pow(10, decimals);

// Dispute Config
export const basicDisputeOptions: DisputeOptions = {
    users: [null, null],
    graceDurationSeconds: 0.1*60,
    initCaseDurationSeconds: 0.18*60,
    commitDurationSeconds: 0.26*60,
    revealDurationSeconds: 0.38*60,
    voterRepRequired: new anchor.BN(5 * LAMPORTS_PER_MINT),
    voterRepCost: new anchor.BN(0),
    partyRepCost: new anchor.BN(15 * LAMPORTS_PER_MINT),
    partyPayCost: new anchor.BN(0),
    minVotes: new anchor.BN(1),
    protocolPay: new anchor.BN(0),
    protocolRep: new anchor.BN(5 * LAMPORTS_PER_MINT)
}

export const noRevealDisputeOptions: DisputeOptions = {
    users: [null, null],
    graceDurationSeconds: 0.1*60,
    initCaseDurationSeconds: 0.18*60,
    commitDurationSeconds: 0.26*60,
    revealDurationSeconds: 0.38*60,
    voterRepRequired: new anchor.BN(5 * LAMPORTS_PER_MINT),
    voterRepCost: new anchor.BN(4 * LAMPORTS_PER_MINT),
    partyRepCost: new anchor.BN(15 * LAMPORTS_PER_MINT),
    partyPayCost: new anchor.BN(0),
    minVotes: new anchor.BN(1),
    protocolPay: new anchor.BN(0),
    protocolRep: new anchor.BN(5 * LAMPORTS_PER_MINT)
}