use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeCourt<'info> {
    #[account(
        init,
        seeds = [b"court".as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Court::SIZE;
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub payer: Signer<'info>, // protocol that makes CPI

    pub system_program: Program<'info, System>,
}

pub fn initialize_court(ctx: Context<InitializeCourt>) -> Result<()> {
    let court = &mut ctx.accounts.court;
    let bump = *ctx.bumps.get("court").unwrap();
    court.set_inner(Court {
        authority:  ctx.accounts.payer.key(),
        num_disputes: 0,
        bump
    });

    Ok(())
}
