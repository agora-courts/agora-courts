use crate::state::*;
use anchor_lang::prelude::*;

pub fn close_dispute(
    ctx: Context<CloseDispute>,
    _dispute_id: u64
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    dispute.can_close()?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(_dispute_id: u64)]
pub struct CloseDispute<'info> {
    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), _dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, // anyone that is closing a dispute
}
