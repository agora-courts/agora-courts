import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js';
import { AgoraCourt } from '../../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccountInstruction, 
    createMintToInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getMintInfo, getDisputeID, getSingleUser, getUsers } from "./config";

//MUST SET USER CORRECTLY IN CONFIG TO VOTE FOR RIGHT PERSON

describe('agora-court', () => {
    //get keys and info
    let [mintAuthority, repMint, decimals] = getMintInfo();
    let disputeId = getDisputeID();
    let candidate = getSingleUser();
    let [_a, _b, voter] = getUsers();

    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test specific information
    console.log("mint auth: ", mintAuthority.publicKey.toString());
    console.log("repmint: ", repMint.publicKey.toString());

    it('vote!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();

        //find PDAs
        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
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
                    voter.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );

        const [casePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("case"),
                    disputePDA.toBuffer(),
                    candidate.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        //dispute & voter rep vault
        const repVault = getAssociatedTokenAddressSync(
            repMint.publicKey,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const userRepATA = getAssociatedTokenAddressSync(
            repMint.publicKey,
            voter.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const receiver = await connection.getAccountInfo(userRepATA);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    userRepATA,
                    voter.publicKey,
                    repMint.publicKey,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        //voter needs 5 rep
        let LAMPORTS_PER_MINT = Math.pow(10, decimals);
        tx.add(
            createMintToInstruction(
                repMint.publicKey,
                userRepATA,
                mintAuthority.publicKey,
                10*LAMPORTS_PER_MINT,
            )
        );

        console.log("Voter Pubkey: ", voter.publicKey.toString());
        console.log("Voter ATA: ", userRepATA.toString());
        console.log("Rep Vault: ", repVault.toString());

        tx.add(
            await agoraProgram.methods
                .selectVote(
                    disputeId,
                )
                .accounts({
                    case: casePDA,
                    candidate: candidate.publicKey,
                    voterRecord: recordPDA,
                    dispute: disputePDA,
                    repVault: repVault,
                    court: courtPDA,
                    repMint: repMint.publicKey,
                    courtAuthority: signer.publicKey,
                    payer: voter.publicKey,
                    userRepAta: userRepATA,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers(
                    [voter]
                )
                .instruction()
        );

        await provider.sendAndConfirm(tx, [voter, mintAuthority]);

        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        let caseState = await agoraProgram.account.case.fetch(casePDA);
        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);

        console.log("Total Votes: ", disputeState.votes);
        console.log("Case Votes: ", caseState.votes);
        console.log("Record: ", recordState.claimQueue);
    });
});
