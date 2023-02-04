use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(users: Vec<Pubkey>)]
pub struct InitializeDispute<'info> {
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
        seeds = [b"court".as_ref(), payer.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    #[account(mut)]
    pub payer: Signer<'info>, // protocol that makes CPI

    pub system_program: Program<'info, System>,
}

pub fn initialize_dispute(
    ctx: Context<InitializeDispute>,
    users: Vec<Pubkey>,
    config: DisputeConfiguration,
) -> Result<()> {
    require!(Clock::get().unwrap().unix_timestamp < config.init_cases_ends_at, InputError::InvalidEndTime);
    require!(Clock::get().unwrap().unix_timestamp < config.ends_at, InputError::InvalidEndTime);
    require!(!users.is_empty(), InputError::UsersEmpty);

    let dispute = &mut ctx.accounts.dispute;
    let bump = *ctx.bumps.get("dispute").unwrap();
    dispute.set_inner(Dispute {
        users,
        status: DisputeStatus::Waiting,
        submitted_cases: 0,
        leader: CaseLeader {
            user: Pubkey::default(),
            votes: 0,
        },
        config,
        bump,
    });
    ctx.accounts.court.num_disputes += 1;

    Ok(())
}
