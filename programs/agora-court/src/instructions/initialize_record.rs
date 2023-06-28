//use std::collections::BinaryHeap;
use crate::state::{VoterRecord, Court};
use anchor_lang::prelude::*;

pub fn initialize_record(ctx: Context<InitializeRecord>, _court_name: String) -> Result<()> {
    let reputation = &mut ctx.accounts.record;
    let bump = *ctx.bumps.get("record").unwrap();
    reputation.set_inner(VoterRecord {
        claim_queue: Vec::new(),
        currently_staked_rep: 0,
        currently_staked_pay: 0,
        bump,
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(_court_name: String)]
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
        seeds = ["court".as_bytes(), _court_name.as_bytes()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
