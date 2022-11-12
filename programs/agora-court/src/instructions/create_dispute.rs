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
        space = Dispute::get_space(users)
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(mut)]
    pub court: Account<'info, Court>,

    pub court_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_dispute(ctx: Context<CreateDispute>, users: Vec<Pubkey>) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    dispute.initialize(ctx.accounts.court.key(), users);

    require!(
        ctx.accounts.court.key() == ctx.accounts.court_authority.key(),
        InputError::InvalidCourtAuthority
    );

    require!(
        users.contains(&ctx.accounts.payer.key()),
        InputError::DisputeDoesNotContainPayer
    );

    Ok(())
}
