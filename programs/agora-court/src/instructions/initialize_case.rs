use crate::{error::InputError, state::{dispute::*, case::*, voter_record::*, Court}};
use anchor_lang::prelude::*;

//when first case is added, change dispute status also
//if before grace period and not all users have interacted, shouldn't be able to init case (for now) (see interact.rs)

//pushes case to dispute record to cap involvement in disputes
//in our prev implementation, the binary heap made perfect sense. It was to limit a user's exposure to disputes.
//but now, with pre-dispute staking, that should be done in the interact section? TBD.

pub fn initialize_case(ctx: Context<InitializeCase>, dispute_id: u64, evidence: String) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let voter_record = &mut ctx.accounts.voter_record;

    //check timing / status
    dispute.can_add_case()?;

    //initialize case account
    let case = &mut ctx.accounts.case;
    let bump = *ctx.bumps.get("case").unwrap();
    case.set_inner(Case {
        votes: 0,
        evidence,
        bump,
    });

    //push dispute to binary heap
    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: dispute.config.ends_at,
        user_voted_for: ctx.accounts.payer.key() //your own "case" - prevents voting for yourself
    };
    voter_record.push(dispute_record);

    //inc cases
    //See interact.rs WARNING comment. same issue here if there is a None in the vector
    //due to init case acc for IX, users cannot call this IX more than once
    //but for now, subtracting None count from len(). edge case is if someone interacts twice,
    //then it's impossible for Voting to commence until time period starts.

    dispute.submitted_cases += 1;
    let none_count = dispute.users.iter().filter(|&&x| x.is_none()).count();
    if dispute.submitted_cases == (dispute.users.len() - none_count) as u8 {
        dispute.status = DisputeStatus::Voting;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(dispute_id: u64, evidence: String)]
pub struct InitializeCase<'info> {
    //a single user's case
    #[account(
        init,
        seeds = ["case".as_bytes(), dispute.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Case::get_size(&evidence)
    )]
    pub case: Account<'info, Case>,

    //checks claimed disputes, lengths, and prevents duplicate case
    //might have to remove constraint on claim queue len TBD
    #[account(
        mut,
        seeds = ["record".as_bytes(), court.key().as_ref(), payer.key().as_ref()],
        bump = voter_record.bump,
        constraint = !voter_record.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,
        constraint = voter_record.claim_queue.len() < court.max_dispute_votes as usize
                    @ InputError::UserMaxDisputesReached,
        constraint = voter_record.in_dispute(dispute_id) @ InputError::UserAlreadyProvidedCase
    )]
    pub voter_record: Account<'info, VoterRecord>,

    //checks case timing and user involvement
    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
        constraint = dispute.users.contains(&Some(payer.key()))
                    @ InputError::UserDoesNotHaveCase,
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        seeds = ["court".as_bytes(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    /// CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>, // user adding their case
    pub system_program: Program<'info, System>,
}