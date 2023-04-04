use anchor_lang::prelude::*;
use agora_court::program::AgoraCourt;
use agora_court::cpi::accounts::SelectVote;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::protocol::*;

pub fn token_vote(
    ctx: Context<TokenVote>,
    id: u64
) -> Result<()> {
    //calls init dispute and creates Ticker account
    let vote_cost = 10*LAMPORTS_PER_SOL;
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
            to: ctx.accounts.user_rep_ata.to_account_info(),
            authority: ctx.accounts.protocol.to_account_info()
        },
        seeds
    );

    if ctx.accounts.user_rep_ata.amount < vote_cost {
        let diff = vote_cost - ctx.accounts.user_rep_ata.amount;
        anchor_spl::token::mint_to(cpi_ctx, diff)?;
    }

    let vote_cpi = CpiContext::new(
        ctx.accounts.agora_program.to_account_info(),
        SelectVote {
            case: ctx.accounts.case_pda.to_account_info(),
            candidate: ctx.accounts.candidate.to_account_info(),
            voter_record: ctx.accounts.record_pda.to_account_info(),
            dispute: ctx.accounts.dispute_pda.to_account_info(),
            rep_vault: ctx.accounts.rep_vault.to_account_info(),
            court: ctx.accounts.court_pda.to_account_info(),
            rep_mint: ctx.accounts.rep_mint.to_account_info(),
            court_authority: ctx.accounts.protocol.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            user_rep_ata: ctx.accounts.user_rep_ata.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info()
        }
    );

    agora_court::cpi::select_vote(vote_cpi, id)
}

#[derive(Accounts)]
pub struct TokenVote<'info> {
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
    ///CHECK: Agora Court will check this for us
    pub candidate: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub case_pda: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub record_pda: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    pub court_pda: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub dispute_pda: UncheckedAccount<'info>,
    ///CHECK: Agora Court will check this for us
    #[account(mut)]
    pub rep_vault: UncheckedAccount<'info>,

    pub payer: Signer<'info>,

    #[account(mut)]
    pub user_rep_ata: Account<'info, TokenAccount>,

    pub agora_program: Program<'info, AgoraCourt>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}