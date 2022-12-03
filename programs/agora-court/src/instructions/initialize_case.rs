use crate::{error::InputError, state::*};
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
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = dispute.status == DisputeStatus::Waiting
                    @ InputError::CasesAlreadySubmitted,

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

pub fn create_case(ctx: Context<CreateCase>, _dispute_id: u64, evidence: String) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    // TODO: transfer `dispute.arb_cost` from `payer` to `dispute` escrow
    let case = &mut ctx.accounts.case;
    let bump = *ctx.bumps.get("case").unwrap();
    case.set_inner(Case {
        votes: 0,
        evidence,
        bump,
    });
    dispute.submitted_cases += 1;
    // this doesn't prevent one person submitting multiple cases,
    // I propose pre-initializing all cases in `initialize_dispute.rs`
    if dispute.submitted_cases == dispute.users.len() {
        dispute.status = DisputeStatus::Voting;
    }

    Ok(())
}
