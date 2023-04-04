import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { DemoTokens } from '../../target/types/demo_tokens';

describe('demo-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const demoProgram = anchor.workspace.DemoTokens as Program<DemoTokens>;
    const demoProvider = demoProgram.provider as anchor.AnchorProvider;

    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;

    //PARAMETERS
    const id = new anchor.BN(0);
    const candidate = PublicKey.default;
    const voter = Keypair.generate();

    //ENSURE voter has init record

    it('vote_for_token!', async () => {
        //signer is just the wallet
        const signer = demoProvider.wallet;
        let tx = new Transaction();
        const [repMintPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("rep_mint")
                ],
                demoProgram.programId
            );
        
        const [protocolPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("protocol")
                ],
                demoProgram.programId
            );

        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    protocolPDA.toBuffer()
                ],
                agoraProgram.programId
            );

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    id.toArrayLike(Buffer, "be", 8)
                ],
                agoraProgram.programId
            );

        const [casePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("case"),
                    disputePDA.toBuffer(),
                    candidate.toBuffer()
                ],
                agoraProgram.programId
            );
            
        const [recordPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    voter.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );
        
        const repVault = getAssociatedTokenAddressSync(
            repMintPDA,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const voterRepATA = getAssociatedTokenAddressSync(
            repMintPDA,
            voter.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        let receiver = await connection.getAccountInfo(voterRepATA);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    voterRepATA,
                    voter.publicKey,
                    repMintPDA,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        //calls the initialize method
        tx.add(
            await demoProgram.methods
            .tokenVote(
                id,
            )
            .accounts({
                protocol: protocolPDA,
                repMint: repMintPDA,
                casePda: casePDA,
                recordPda: recordPDA,
                courtPda: courtPDA,
                disputePda: disputePDA,
                repVault: repVault,
                payer: voter.publicKey,
                userRepAta: voterRepATA,
                agoraProgram: agoraProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers(
                [voter]
            )
            .instruction()
        );

        await provider.sendAndConfirm(tx, [voter]);
    });
});
