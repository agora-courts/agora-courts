use anchor_lang::prelude::*;
use agora_court::cpi::accounts::{InitializeCourt, InitializeDispute};
use agora_court::program::AgoraCourt;
use agora_court::state::DisputeConfiguration;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("8oxb3Kg4kda7LCJoSUVHAZhoqWjmBiLnGZeCyUkJJ22L");

#[program]
pub mod demo_tokens {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        //calls init_court
        let prot = &mut ctx.accounts.protocol;
        let bump = *ctx.bumps.get("protocol").unwrap();
        prot.set_inner(Protocol {
            bump,
            num_tickers: 0
        });

        let transfer_cpi = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.protocol.to_account_info(),
            }
        );
        anchor_lang::system_program::transfer(transfer_cpi, 1*anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL)
    }

    pub fn create_court(ctx: Context<CreateCourt>) -> Result<()> {
        let max_votes: u16 = 10;

        agora_court::cpi::initialize_court(
            CpiContext::new_with_signer(
                ctx.accounts.agora_program.to_account_info(),
                InitializeCourt {
                    court: ctx.accounts.court_pda.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    protocol: ctx.accounts.protocol.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[
                    &[
                        "protocol".as_bytes(),
                        &[ctx.accounts.protocol.bump]
                    ]
                ]
            ), 
            ctx.accounts.rep_mint.key(), 
            None, 
            max_votes
        )
    }

    pub fn submit_token(
        ctx: Context<Submit>, 
        address: String,
        image: String,
        name: String,
        ticker: String,
        description: String,
        badges: Vec<String>,
    ) -> Result<()> {
        //calls init dispute
        //calls interact for the user
        //ensure protocol acc has enough SOL when calling

        ctx.accounts.protocol.num_tickers += 1;

        let ticker_acc = &mut ctx.accounts.ticker_acc;
        ticker_acc.set_inner(
            Ticker { address, image, name, ticker, description, badges }
        );

        let seeds: &[&[&[u8]]] = &[
            &[
                "protocol".as_bytes(),
                &[ctx.accounts.protocol.bump]
            ]
        ];

        let dispute_cpi = CpiContext::new_with_signer(
            ctx.accounts.agora_program.to_account_info(),
            InitializeDispute {
                dispute: ctx.accounts.dispute_pda.to_account_info(),
                rep_vault: ctx.accounts.rep_vault.to_account_info(),
                pay_vault: None,
                court: ctx.accounts.court_pda.to_account_info(),
                payer: ctx.accounts.payer.to_account_info(),
                protocol: ctx.accounts.protocol.to_account_info(), //payer
                protocol_pay_ata: None,
                protocol_rep_ata: Some(ctx.accounts.protocol_rep_ata.to_account_info()),
                rep_mint: ctx.accounts.rep_mint.to_account_info(),
                pay_mint: None,
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            },
            seeds
        );

        let users: Vec<Option<Pubkey>> = Vec::from([None, None]);

        let timestamp = Clock::get().unwrap().unix_timestamp;

        let dispute_config = DisputeConfiguration {
            grace_ends_at: timestamp + (15*60),
            init_cases_ends_at: timestamp + (25*60),
            ends_at: timestamp + (40*60),
            voter_rep_required: 5*u64::pow(10, 9),
            voter_rep_cost: 0,
            rep_cost: 10*u64::pow(10, 9),
            pay_cost: 0,
            min_votes: 1,
            protocol_pay: 0,
            protocol_rep: 100*u64::pow(10, 9)
        };

        agora_court::cpi::initialize_dispute(dispute_cpi, users, dispute_config)
    }

    pub fn receive_tokens(ctx: Context<ReceiveTokens>) -> Result<()> {
        //simply mint 150 tokens to any user for demo

        let seeds: &[&[&[u8]]] = &[
            &[
                "protocol".as_bytes(),
                &[ctx.accounts.protocol.bump]
            ]
        ];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.rep_mint.to_account_info(),
                to: ctx.accounts.token_acc.to_account_info(),
                authority: ctx.accounts.protocol.to_account_info()
            },
            seeds
        );

        anchor_spl::token::mint_to(cpi_ctx, 150 * u64::pow(10, 9))
    }

    //IX's abstracted to frontend for demo purposes -> ideally all interact and init dispute should be CPI

}

#[account]
pub struct Protocol {
    pub bump: u8,
    pub num_tickers: u8,
}

#[account]
pub struct Ticker {
    pub address: String,
    pub image: String,
    pub name: String,
    pub ticker: String,
    pub description: String,
    pub badges: Vec<String>,
}

impl Ticker {
    pub fn get_size(a: String, i: String, n: String, t: String, d: String, b: Vec<String>) -> usize {
        let mut lens: usize = 0;
        for str in &b {
            lens += 4 + str.len();
        }

        8 + 4 + a.len() + 4 + i.len() + 4 + n.len() + 4 + t.len() + 4 + d.len() + 4 + b.len() + lens
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1 + 1,
        seeds = ["protocol".as_bytes()], bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        mint::authority = protocol,
        mint::freeze_authority = protocol,
        seeds = ["rep_mint".as_bytes()], bump
    )]
    pub rep_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>, //literally just pays for init
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCourt<'info> {
    #[account(
        mut,
        seeds = ["protocol".as_bytes()], bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = ["rep_mint".as_bytes()], bump
    )]
    pub rep_mint: Account<'info, Mint>,
    ///CHECK: Agora Court will check this for us - next thing to change
    #[account(mut)]
    pub court_pda: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, //literally just pays for init

    #[account(
        executable,
    )]
    pub agora_program: Program<'info, AgoraCourt>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    address: String,
    image: String,
    name: String,
    ticker: String,
    description: String,
    badges: Vec<String>
)]
pub struct Submit<'info> {
    #[account(
        mut,
        seeds = ["protocol".as_bytes()], bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = ["rep_mint".as_bytes()], bump
    )]
    pub rep_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = ["ticker".as_bytes(), &[protocol.num_tickers]], bump,
        space = Ticker::get_size(address, image, name, ticker, description, badges)
    )]
    pub ticker_acc: Account<'info, Ticker>,

    ///CHECK: Agora Court will check this for us
    pub court_pda: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    pub dispute_pda: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    pub rep_vault: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    pub protocol_rep_ata: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, //paying / interact

    pub agora_program: Program<'info, AgoraCourt>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReceiveTokens<'info> {
    #[account(
        mut,
        seeds = ["protocol".as_bytes()], bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = ["rep_mint".as_bytes()], bump
    )]
    pub rep_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub token_acc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
