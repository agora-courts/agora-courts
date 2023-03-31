use anchor_lang::prelude::*;
use agora_court::program::AgoraCourt;
use agora_court::cpi::accounts::{InitializeDispute, Interact};
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use agora_court::state::DisputeConfiguration;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::{protocol::*, ticker::*};

pub fn submit_token(
    ctx: Context<Submit>, 
    address: String,
    image: String,
    name: String,
    ticker: String,
    description: String,
    badges: Vec<String>
) -> Result<()> {
    //calls init dispute and creates Ticker account
    let n = ctx.accounts.protocol.num_tickers;
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
            protocol: ctx.accounts.protocol.to_account_info(),
            protocol_pay_ata: None,
            protocol_rep_ata: Some(ctx.accounts.protocol_rep_ata.to_account_info()),
            rep_mint: ctx.accounts.rep_mint.to_account_info(),
            pay_mint: Some(ctx.accounts.pay_mint.to_account_info()),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        },
        seeds
    );

    //we control interactions, no need to specify pubkeys for us
    let users: Vec<Option<Pubkey>> = Vec::from([None, None]);

    let timestamp = Clock::get().unwrap().unix_timestamp;
    let prot_rep = 100*u64::pow(10, 9);

    let dispute_config = DisputeConfiguration {
        grace_ends_at: timestamp + (60*60), //1 hour to challenge
        init_cases_ends_at: timestamp + (61*60), //not relevant (follow grace)
        ends_at: timestamp + (120*60), //1 hour to vote
        voter_rep_required: 0,
        voter_rep_cost: 10*u64::pow(10, 9), //vote cost is 10, req is 0 - we will mint low rep users some tokens
        rep_cost: 0,
        pay_cost: 2*LAMPORTS_PER_SOL,
        min_votes: 1,
        protocol_pay: 0,
        protocol_rep: prot_rep
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::MintTo {
            mint: ctx.accounts.rep_mint.to_account_info(),
            to: ctx.accounts.protocol_rep_ata.to_account_info(),
            authority: ctx.accounts.protocol.to_account_info()
        },
        seeds
    );

    if ctx.accounts.protocol_rep_ata.amount < prot_rep {
        let diff = prot_rep - ctx.accounts.protocol_rep_ata.amount;
        anchor_spl::token::mint_to(cpi_ctx, diff)?;
    }

    let interact_cpi = CpiContext::new(
        ctx.accounts.agora_program.to_account_info(),
        Interact {
            dispute: ctx.accounts.dispute_pda.to_account_info(),
            rep_vault: ctx.accounts.rep_vault.to_account_info(),
            pay_vault: Some(ctx.accounts.pay_vault.to_account_info()),
            record: ctx.accounts.record_pda.to_account_info(),
            court: ctx.accounts.court_pda.to_account_info(),
            court_authority: ctx.accounts.protocol.to_account_info(),
            user: ctx.accounts.payer.to_account_info(),
            user_pay_ata: Some(ctx.accounts.user_pay_ata.to_account_info()),
            user_rep_ata: None,
            rep_mint: ctx.accounts.rep_mint.to_account_info(),
            pay_mint: Some(ctx.accounts.pay_mint.to_account_info()),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info()
        }
    );

    agora_court::cpi::initialize_dispute(dispute_cpi, users, dispute_config)?;

    agora_court::cpi::interact(interact_cpi, n as u64)
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

    //Agora Court will validate this token account
    #[account(mut)]
    pub protocol_rep_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = ["rep_mint".as_bytes()], bump
    )]
    pub rep_mint: Account<'info, Mint>,

    ///CHECK: Agora Court will check this for us
    pub pay_mint: UncheckedAccount<'info>, //native token mint

    #[account(
        init,
        payer = payer,
        seeds = ["ticker".as_bytes(), &[protocol.num_tickers]], bump,
        space = Ticker::get_size(address, image, name, ticker, description, badges)
    )]
    pub ticker_acc: Account<'info, Ticker>,

    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub court_pda: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub dispute_pda: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub rep_vault: UncheckedAccount<'info>,

    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub pay_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, //paying / interact

    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub record_pda: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub user_pay_ata: UncheckedAccount<'info>,

    pub agora_program: Program<'info, AgoraCourt>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}