use crate::{state::*};
use anchor_lang::prelude::*;

//make pay mint Option -> rep mint is required

pub fn initialize_court(
    ctx: Context<InitializeCourt>, 
    rep_mint: Pubkey, 
    pay_mint: Option<Pubkey>, 
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
        seeds = ["court".as_bytes(), protocol.key().as_ref()],
        bump,
        payer = protocol,
        space = Court::SIZE
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub protocol: Signer<'info>, // protocol that makes CPI, has to sign for all future init_disputes too!

    pub system_program: Program<'info, System>,
}
