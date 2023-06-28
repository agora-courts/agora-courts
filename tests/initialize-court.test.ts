import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../target/types/agora_court';
import { 
    TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint
} from "@solana/spl-token";
import { setMint } from './utils';
import { networkURL, maxDisputeVotes, decimals, courtName } from './config';

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const connection = new Connection(networkURL);

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test parameters
    const mintAuthority = Keypair.generate();
    const repMint = Keypair.generate();
    const protocol = Keypair.generate();

    console.log("Mint Authority Pubkey: ", mintAuthority.publicKey.toString());
    console.log("Mint Pubkey: ", repMint.publicKey.toString());
    console.log("Protocol Pubkey: ", protocol.publicKey.toString());

    it('initialize_court!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();

        //airdrop 1 SOL for fees
        const airdropSignature = await connection.requestAirdrop(
            mintAuthority.publicKey,
            2*LAMPORTS_PER_SOL,
        );
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });

        tx.add(
            SystemProgram.transfer({
                fromPubkey: mintAuthority.publicKey,
                lamports: 1*LAMPORTS_PER_SOL,
                toPubkey: protocol.publicKey,
            })
        )

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
                    anchor.utils.bytes.utf8.encode(courtName),
                ],
                agoraProgram.programId
            );

        //calls the initialize method
        tx.add(
            await agoraProgram.methods
            .initializeCourt(
                courtName,
                repMint.publicKey,
                null,
                maxDisputeVotes
            )
            .accounts({
                court: courtPDA,
                authority: signer.publicKey,
                protocol: protocol.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .instruction()
        )
        
        await provider.sendAndConfirm(tx, [mintAuthority, repMint]);

        console.log("Court PDA: ", courtPDA.toString());

        let courtState = await agoraProgram.account.court.fetch(courtPDA);

        expect(courtState.maxDisputeVotes).to.equal(maxDisputeVotes);

        console.log("Court State: ", courtState);

        console.log("Num Disputes (BN): ", courtState.numDisputes.toNumber().toString());
        console.log("stored_rep_mint: ", courtState.repMint.toString());
        console.log("stored_pay_mint (null): ", courtState.payMint);

        setMint(protocol, mintAuthority, repMint, decimals);
    });
});
