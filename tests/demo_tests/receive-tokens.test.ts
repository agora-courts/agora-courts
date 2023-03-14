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

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const demoProgram = anchor.workspace.DemoTokens as Program<DemoTokens>;
    const demoProvider = demoProgram.provider as anchor.AnchorProvider;

    it('receive_tokens_free!', async () => {
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

        console.log("protocol: ", protocolPDA.toString());

        const ATA = getAssociatedTokenAddressSync( //ATA for protocol, can change to anyone
            repMintPDA,
            protocolPDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const receiver = await connection.getAccountInfo(ATA);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction (
                    signer.publicKey,
                    ATA,
                    protocolPDA,
                    repMintPDA
                )
            )
        }

        //calls the initialize method
        tx.add(
            await demoProgram.methods
            .receiveTokens(
                
            )
            .accounts({
                protocol: protocolPDA,
                repMint: repMintPDA,
                payer: signer.publicKey,
                tokenAcc: ATA,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .instruction()
        );

        await provider.sendAndConfirm(tx);

        console.log("rep_mint: ", repMintPDA.toString());
        console.log("protocol: ", protocolPDA.toString());

        console.log("ata: ", ATA.toString())
    });
});
