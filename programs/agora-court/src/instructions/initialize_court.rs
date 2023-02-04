use crate::{state::*};
use anchor_lang::prelude::*;

pub fn initialize_court(
    ctx: Context<InitializeCourt>, 
    rep_mint: Pubkey, 
    pay_mint: Pubkey, 
    max_dispute_votes: u16
) -> Result<()> {
    let court = &mut ctx.accounts.court;
    let bump = *ctx.bumps.get("court").unwrap();
    court.set_inner(Court {
        rep_mint,
        pay_mint,
        num_disputes: 0,
        max_dispute_votes,
        bump
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeCourt<'info> {
    #[account(
        init,
        seeds = [b"court".as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Court::SIZE
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub payer: Signer<'info>, // protocol that makes CPI

    pub system_program: Program<'info, System>,
}
