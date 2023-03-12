use std::collections::BinaryHeap;
use crate::state::{VoterRecord, Court};
use anchor_lang::prelude::*;

pub fn initialize_record(ctx: Context<InitializeRecord>) -> Result<()> {
    let reputation = &mut ctx.accounts.record;
    let bump = *ctx.bumps.get("record").unwrap();
    reputation.set_inner(VoterRecord {
        claim_queue: BinaryHeap::with_capacity(ctx.accounts.court.max_dispute_votes as usize),
        currently_staked_rep: 0,
        currently_staked_pay: 0,
        bump,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeRecord<'info> {
    #[account(
        init,
        seeds = ["record".as_bytes(), court.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = VoterRecord::get_size(court.max_dispute_votes)
    )]
    pub record: Account<'info, VoterRecord>,

    #[account(
        seeds = ["court".as_bytes(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    ///CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
