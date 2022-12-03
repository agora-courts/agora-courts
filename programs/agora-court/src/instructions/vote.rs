use crate::{constant::USER_MAX_DISPUTES, error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(dispute_id: u64, user_case: Pubkey)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = [b"case".as_ref(), court.key().as_ref(), dispute.key().as_ref(), user_case.as_ref()],
        bump = case.bump,
   )]
    pub case: Account<'info, Case>,

    #[account(
        mut,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump = reputation.bump,
        constraint = !reputation.in_dispute(dispute_id)
                    @ InputError::UserAlreadyVoted,

        constraint = !reputation.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,

        constraint = reputation.claim_queue.len() < USER_MAX_DISPUTES
                    @ InputError::UserMaxDisputesReached,

        constraint = reputation.reputation >= dispute.config.rep_required
                    @ InputError::UserDoesNotHaveEnoughReputation,
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = dispute.status == DisputeStatus::Voting
                    @ InputError::DisputeNotVotable,
   )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"court".as_ref(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    /// CHECK: Creator of court.
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn vote(ctx: Context<Vote>, dispute_id: u64, user_case: Pubkey) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;
    let case = &mut ctx.accounts.case;

    case.votes += 1;
    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: ctx.accounts.dispute.config.ends_at,
        case: user_case,
    };
    reputation.claim_queue.push(dispute_record);

    Ok(())
}
