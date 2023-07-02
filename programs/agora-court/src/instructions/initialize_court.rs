use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

//First IX a protocol would invoke

pub fn initialize_court(
    ctx: Context<InitializeCourt>, 
    _court_name: String,
    max_dispute_votes: u16
) -> Result<()> {
    let court = &mut ctx.accounts.court;
    let bump = *ctx.bumps.get("court").unwrap();

    let pay_mint = match &ctx.accounts.pay_mint {
        Some(n) => Some(n.key()),
        None => None
    };

    court.set_inner(Court {
        edit_authority: ctx.accounts.authority.key(),
        protocol: ctx.accounts.protocol.key(),
        rep_mint: ctx.accounts.rep_mint.key(),
        pay_mint,
        num_disputes: 0,
        max_dispute_votes,
        bump
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    _court_name: String, 
    max_dispute_votes: u16
)]
pub struct InitializeCourt<'info> {
    #[account(
        init,
        seeds = ["court".as_bytes(), _court_name.as_bytes()],
        bump,
        payer = authority,
        space = Court::SIZE
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub authority: Signer<'info>, //edit authority signs
    ///CHECK: protocol that makes CPI has to sign for all init_disputes
    pub protocol: UncheckedAccount<'info>,
    pub rep_mint: Account<'info, Mint>,
    pub pay_mint: Option<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
}
