import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Connection } from '@solana/web3.js';
import { AgoraCourt } from '../target/types/agora_court';
import { getDisputeID } from "./utils"
import { courtName, networkURL } from './config';

describe('agora-court', () => {
    //get information from json
    let disputeId = getDisputeID();
    
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const connection = new Connection(networkURL);

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    it('close_dispute!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;

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

        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        console.log(disputeState);

        await agoraProgram.methods
            .closeDispute(
                disputeId
            )
            .accounts({
                dispute: disputePDA,
                court: courtPDA,
                payer: signer.publicKey
            })
            .rpc();

        disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        console.log("Closed dispute: ", disputeState);  
    });
});


