import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint
} from "@solana/spl-token";
import { setMint } from './config';

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test parameters
    const decimals = 9;
    const max_dispute_votes = 9;
    const mintAuthority = Keypair.generate();
    const repMint = Keypair.generate();

    console.log("Mint Authority Pubkey: ", mintAuthority.publicKey.toString());
    console.log("Mint Pubkey: ", repMint.publicKey.toString());

    it('initialize_court!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();

        //airdrop 1 SOL for fees
        const airdropSignature = await connection.requestAirdrop(
            mintAuthority.publicKey,
            1*LAMPORTS_PER_SOL,
        );
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });

        //create a new mint for testing
        tx.add(
            SystemProgram.createAccount({
                fromPubkey: mintAuthority.publicKey,
                newAccountPubkey: repMint.publicKey,
                space: MINT_SIZE,
                lamports: await getMinimumBalanceForRentExemptMint(connection),
                programId: TOKEN_PROGRAM_ID
            }),
            createInitializeMint2Instruction(
                repMint.publicKey,
                decimals,
                mintAuthority.publicKey,
                null
            )
        )

        //court PDA
        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );

        //calls the initialize method
        tx.add(
            await agoraProgram.methods
            .initializeCourt(
                repMint.publicKey,
                null,
                max_dispute_votes
            )
            .accounts({
                court: courtPDA,
                payer: signer.publicKey,
                protocol: signer.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .instruction()
        )
        
        await provider.sendAndConfirm(tx, [mintAuthority, repMint]);

        console.log("Court PDA: ", courtPDA.toString());

        let courtState = await agoraProgram.account.court.fetch(courtPDA);

        expect(courtState.maxDisputeVotes).to.equal(max_dispute_votes);

        console.log("Num Disputes (BN): ", courtState.numDisputes.toNumber().toString());
        console.log("stored_rep_mint: ", courtState.repMint.toString());
        console.log("stored_pay_mint (null): ", courtState.payMint);

        setMint(mintAuthority, repMint, decimals);
    });
});
