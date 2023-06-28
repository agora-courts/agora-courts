import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { AgoraCourt } from '../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getMintInfo, getDisputeID, getSingleUser } from "./utils"
import { courtName, networkURL } from './config';

//MUST SET USER CORRECTLY IN CONFIG TO CALL MORE THAN ONCE

describe('agora-court', () => {
    //get accounts from json
    let [mintAuthority, repMint, _] = getMintInfo();
    let disputeId = getDisputeID();
    let user = getSingleUser();

    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection(networkURL);

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test specific information
    console.log("mint auth: ", mintAuthority.publicKey.toString());
    console.log("repmint: ", repMint.publicKey.toString());

    it('claim!', async () => {
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
        
        const [recordPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        console.log("record before: ", recordState);
        console.log("record stake: ", recordState.currentlyStakedRep.toNumber().toString());
        
        const rep_vault_ata = getAssociatedTokenAddressSync(
            repMint.publicKey,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID   
        );

        const fromATA = getAssociatedTokenAddressSync(
            repMint.publicKey,
            user.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log("From Rep ATA: ", fromATA.toString());
        console.log("Rep ATA: ", rep_vault_ata.toString());

        await agoraProgram.methods
            .claim(
                courtName,
                disputeId
            )
            .accounts({
                voterRecord: recordPDA,
                dispute: disputePDA,
                repVault: rep_vault_ata,
                payVault: agoraProgram.programId, //None
                court: courtPDA,
                user: user.publicKey,
                userPayAta: agoraProgram.programId, //None
                userRepAta: fromATA,
                repMint: repMint.publicKey,
                payMint: agoraProgram.programId, //None
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
            })
            .signers(
                [user]
            )
            .rpc();

        recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        console.log("record after: ", recordState);
        console.log("record stake after: ", recordState.currentlyStakedRep.toNumber().toString());
        console.log("user pubkey: ", user.publicKey.toString());
    });
});
