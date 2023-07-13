use crate::state::{dispute::*, case::*, voter_record::*};
use anchor_lang::prelude::*;

pub fn reveal_vote(
    ctx: Context<RevealVote>,
    _court_name: String, 
    dispute_id: u64,
    salt: String
) -> Result<()> {
    //grab accounts
    let dispute = &mut ctx.accounts.dispute;
    let case = &mut ctx.accounts.case;

    //check status
    dispute.can_reveal()?;

    //verify commit
    let candidate = ctx.accounts.candidate.key();
    ctx.accounts.voter_record.verify_hash(candidate, &salt, dispute_id)?;

    //increment votes
    case.votes += 1;
    dispute.votes += 1;
    if case.votes > dispute.leader.votes {
        dispute.leader = CaseLeader {
            user: candidate,
            votes: case.votes
        }
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    _court_name: String, 
    dispute_id: u64,
    salt: String
)]
pub struct RevealVote<'info> {
    #[account(
        mut,
        seeds = ["case".as_bytes(), dispute.key().as_ref(), candidate.key().as_ref()],
        bump = case.bump
    )]
    pub case: Account<'info, Case>,

    ///CHECK: Case account won't exist if incorrect
    pub candidate: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = ["record".as_bytes(), court.key().as_ref(), payer.key().as_ref()],
        bump = voter_record.bump,
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    ///CHECK: Court does not need to verified - not creating accounts
    pub court: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, // user voting
}