use anchor_lang::prelude::*;

use agora_court::cpi::accounts::InitializeCourt;
use agora_court::program::AgoraCourt;
use crate::state::Protocol;
use anchor_spl::token::{Mint, Token};
use anchor_spl::token::spl_token::native_mint;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //calls init_court
    let prot = &mut ctx.accounts.protocol;
    let bump = *ctx.bumps.get("protocol").unwrap();
    prot.set_inner(Protocol {
        bump,
        num_tickers: 0
    });
    
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
                    &[bump]
                ]
            ]
        ), 
        ctx.accounts.rep_mint.key(), 
        Some(native_mint::id()), 
        max_votes
    )
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

    ///CHECK: Agora Court will check this for us - next thing to change
    #[account(mut)]
    pub court_pda: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, //literally just pays for init
    pub agora_program: Program<'info, AgoraCourt>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}