use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(evidence: String)]
pub struct CreateCase<'info> {
    #[account(
        init,
        seeds = [b"case".as_ref(), dispute.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Case::get_space(evidence)
    )]
    pub case: Account<'info, Case>,

    #[account(mut)]
    pub dispute: Account<'info, Dispute>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_case(ctx: Context<CreateDispute>, evidence: String) -> Result<()> {
    let case = &mut ctx.accounts.case;
    let dispute = &mut ctx.accounts.dispute;
    case.initialize(dispute.key(), evidence);

    require!(
        dispute.status == DisputeStatus::Waiting,
        InputError::EvidenceAlreadySubmitted
    );

    require!(
        dispute.users.contains(&user),
        InputError::UserDoesNotHaveCase
    );

    dispute.case_submitted();

    Ok(())
}
