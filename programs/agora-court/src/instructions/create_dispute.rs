use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(users: Vec<Pubkey>)]
pub struct CreateDispute<'info> {
    #[account(
        init,
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(court.num_disputes).as_ref()],
        bump,
        payer = payer,
        space = Dispute::get_size(users)
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"court".as_ref(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    pub court_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_dispute(
    ctx: Context<CreateDispute>,
    users: Vec<Pubkey>,
    config: DisputeConfiguration,
) -> Result<()> {
    require!(
        users.contains(&ctx.accounts.payer.key()),
        InputError::DisputeDoesNotContainPayer
    );

    let dispute = &mut ctx.accounts.dispute;
    let bump = *ctx.bumps.get("dispute").unwrap();
    dispute.set_inner(Dispute {
        id: ctx.accounts.court.num_disputes,
        users,
        status: DisputeStatus::Waiting,
        abstained_votes: 0,
        submitted_cases: 0,
        config,
        bump,
    });
    ctx.accounts.court.num_disputes += 1;

    Ok(())
}
