import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js';
import { AgoraCourt } from '../target/types/agora_court';
import { getDisputeID, getSingleUser } from "./utils"
import { courtName, networkURL } from './config';

//MUST SET USER CORRECTLY IN CONFIG TO CALL MORE THAN ONCE

describe('agora-court', () => {
    //get key and dispute
    let user = getSingleUser();
    let disputeId = getDisputeID();
    
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection(networkURL);

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    it('init_case!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();

        //find PDAs
        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    anchor.utils.bytes.utf8.encode(courtName),
                ],
                agoraProgram.programId
            );

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    disputeId.toArrayLike(Buffer, "be", 8),
                ],
                agoraProgram.programId
            );

        const [recordPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        const [casePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("case"),
                    disputePDA.toBuffer(),
                    user.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        await agoraProgram.methods
            .initializeCase(
                courtName,
                disputeId,
                "I did not do it, please trust me guys."
            )
            .accounts({
                case: casePDA,
                voterRecord: recordPDA,
                dispute: disputePDA,
                court: courtPDA,
                payer: user.publicKey,
                systemProgram: SystemProgram.programId
            })
            .signers(
                [user]
            )
            .rpc();

        let caseState = await agoraProgram.account.case.fetch(casePDA);
        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);

        console.log("Involved disputes: ", recordState.claimQueue);
        console.log("case evidence: ", caseState.evidence.toString());
        console.log("dispute #: ", disputeState.submittedCases.toString());
        console.log("dispute status: ", disputeState.status);
    });
});
