use std::collections::BinaryHeap;

use crate::{constant::USER_MAX_DISPUTES, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Reputation::get_size(USER_MAX_DISPUTES)
    )]
    pub reputation: Account<'info, Reputation>,

    /// CHECK: Creator of court.
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;
    let bump = *ctx.bumps.get("reputation").unwrap();
    reputation.set_inner(Reputation {
        reputation: 0,
        claim_queue: BinaryHeap::with_capacity(USER_MAX_DISPUTES),
        bump,
    });

    Ok(())
}
