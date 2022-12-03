use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(dispute_id: u64)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump = reputation.bump,
        constraint = reputation.has_unclaimed_disputes()
                    @ InputError::UserHasNoDisputesToClaim,

        constraint = reputation.claim_queue.peek().unwrap().dispute_id == dispute_id
                    @ InputError::UserCannotClaimDispute,
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court_authority.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = matches!(dispute.status, DisputeStatus::Resolved { .. })
                    @ InputError::DisputeNotClaimable,
   )]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: Creator of court.
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn claim(ctx: Context<Claim>, _dispute_id: u64) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let reputation = &mut ctx.accounts.reputation;

    let _voted_on = reputation.claim_queue.pop().unwrap().case;
    if matches!(
        dispute.status,
        DisputeStatus::Resolved { winner: _voted_on }
    ) {
        reputation.add_reputation(dispute.order_price);
    } else {
        reputation.sub_reputation(dispute.order_price);
    }

    Ok(())
}
