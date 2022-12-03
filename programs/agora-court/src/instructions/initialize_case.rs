use crate::{constant::USER_MAX_DISPUTES, error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(dispute_id: u64, evidence: String)]
pub struct CreateCase<'info> {
    #[account(
        init,
        seeds = [b"case".as_ref(), court.key().as_ref(), dispute.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Case::get_size(evidence)
    )]
    pub case: Account<'info, Case>,

    #[account(
        mut,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump = reputation.bump,
        constraint = !reputation.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,

        constraint = reputation.claim_queue.len() < USER_MAX_DISPUTES
                    @ InputError::UserMaxDisputesReached,
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = dispute.can_add_case()
                    @ InputError::CasesNoLongerCanBeSubmitted,

        constraint = dispute.users.contains(&payer.key())
                    @ InputError::UserDoesNotHaveCase,
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
    pub payer: Signer<'info>, // user adding their case

    pub system_program: Program<'info, System>,
}

pub fn create_case(ctx: Context<CreateCase>, dispute_id: u64, evidence: String) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let reputation = &mut ctx.accounts.reputation;
    // TODO: transfer `dispute.arb_cost` from `payer` to `dispute` escrow
    let case = &mut ctx.accounts.case;
    let bump = *ctx.bumps.get("case").unwrap();
    case.set_inner(Case {
        votes: 0,
        evidence,
        bump,
    });
    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: dispute.config.ends_at,
        case: ctx.accounts.payer.key(),
    };
    reputation.claim_queue.push(dispute_record);
    dispute.submitted_cases += 1;
    if dispute.submitted_cases == dispute.users.len() {
        dispute.status = DisputeStatus::Voting;
    }

    Ok(())
}
