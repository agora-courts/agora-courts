use crate::{error::InputError, state::*};
use anchor_lang::{prelude::*};

#[derive(Accounts)]
#[instruction(dispute_id: u64)]
pub struct CloseDispute<'info> {
    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = dispute.can_close()
                    @ InputError::DisputeNotFinalizable,
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
    pub payer: Signer<'info>, // anyone that is closing a dispute
}

pub fn close_dispute(
    ctx: Context<CloseDispute>,
    _dispute_id: u64
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    dispute.status = DisputeStatus::Concluded { winner : 
        if dispute.status == DisputeStatus::Voting { Some(dispute.leader.user) } 
        else { None }
    };

    Ok(())
}
