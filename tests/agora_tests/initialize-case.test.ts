import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccount, 
    createAssociatedTokenAccountInstruction, 
    createInitializeMint2Instruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { disputeId, user } from "./config"

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test specific information

    it('init_case!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;

        let tx = new Transaction();

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
                disputeId,
                "I did not do it, please trust me guys."
            )
            .accounts({
                case: casePDA,
                voterRecord: recordPDA,
                dispute: disputePDA,
                court: courtPDA,
                courtAuthority: signer.publicKey,
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
        console.log("dispute ID stored: ", recordState.claimQueue[0].disputeId.toNumber());
        console.log("case evidence: ", caseState.evidence.toString());
        console.log("dispute cases #: ", disputeState.submittedCases.toString());
        console.log("dispute status: ", disputeState.status);
    });
});
