import * as anchor from "@coral-xyz/anchor";
import { DisputeOptions } from "./court-suite";

//Court Config
export const courtName = "VarunCourt";
export const maxDisputeVotes = 8;
export const decimals = 9;
const LAMPORTS_PER_MINT = Math.pow(10, decimals);

// Dispute Config
export const disputeOptions: DisputeOptions = {
    users: [null, null],
    graceDurationSeconds: 0.5*60,
    initCaseDurationSeconds: 1*60,
    commitDurationSeconds: 1.5*60,
    revealDurationSeconds: 2*60,
    voterRepRequired: new anchor.BN(5 * LAMPORTS_PER_MINT),
    voterRepCost: new anchor.BN(0),
    partyRepCost: new anchor.BN(15 * LAMPORTS_PER_MINT),
    partyPayCost: new anchor.BN(0),
    minVotes: new anchor.BN(1),
    protocolPay: new anchor.BN(0),
    protocolRep: new anchor.BN(5 * LAMPORTS_PER_MINT)
}