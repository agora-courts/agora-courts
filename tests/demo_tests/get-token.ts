import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint
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

    //test specific information

    it('demo_initialize_accounts!', async () => {
        //signer is just the wallet
        const signer = demoProvider.wallet;

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

        const id_bn = new anchor.BN(1);
        
        const [tickerPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("ticker"),
                    id_bn.toArrayLike(Buffer, "be", 8)
                ],
                demoProgram.programId
            );

        let tickerState = await demoProgram.account.ticker.fetch(tickerPDA);
        let protState = await demoProgram.account.protocol.fetch(protocolPDA);

        console.log(protState);
        console.log(tickerState);
    });
});
