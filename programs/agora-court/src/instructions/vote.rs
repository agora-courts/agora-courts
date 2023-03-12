use crate::{error::{InputError, AccountError}, state::dispute::*, state::case::*, state::voter_record::*, state::court::*};
use anchor_lang::prelude::*;
use anchor_spl::{token::{Token, Mint, TokenAccount, self}, associated_token::AssociatedToken};

//afterthought -> maybe add weighted votes based on how many rep tokens they hold
//need to add to dispute config params for weight votes
//also provide a setting so that the person who wins the dispute may somehow win tokens

//TIES ARE NOT YET HANDLED

pub fn vote(ctx: Context<Vote>, dispute_id: u64, candidate: Pubkey) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let voter_record = &mut ctx.accounts.voter_record;
    let case = &mut ctx.accounts.case;
    let user_ata = &mut ctx.accounts.user_rep_ata;

    //check timing / status
    dispute.can_vote()?;

    //check token balance then transfer
    let true_balance = voter_record.currently_staked_rep + user_ata.amount;

    if true_balance < dispute.config.voter_rep_required {
        return err!(InputError::UserDoesNotHaveEnoughReputation);
    }

    let rep_cost = dispute.config.voter_rep_cost;

    if rep_cost > 0 {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: user_ata.to_account_info(),
                to: ctx.accounts.rep_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }
        );

        token::transfer(cpi_ctx, rep_cost)?;
        voter_record.currently_staked_rep += rep_cost;
    }

    case.votes += 1;
    dispute.votes += 1;
    if case.votes > dispute.leader.votes {
        dispute.leader = CaseLeader {
            user: candidate,
            votes: case.votes,
        };
    }

    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: ctx.accounts.dispute.config.ends_at,
        user_voted_for: candidate,
    };
    voter_record.claim_queue.push(dispute_record);

    Ok(())
}

#[derive(Accounts)]
#[instruction(dispute_id: u64, candidate: Pubkey)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = ["case".as_bytes(), dispute.key().as_ref(), candidate.as_ref()],
        bump = case.bump,
   )]
    pub case: Account<'info, Case>,

    #[account(
        mut,
        seeds = ["record".as_bytes(), court.key().as_ref(), user.key().as_ref()],
        bump = voter_record.bump,
        constraint = !voter_record.in_dispute(dispute_id)
                    @ InputError::UserAlreadyVoted,

        constraint = !voter_record.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,

        constraint = voter_record.claim_queue.len() < court.max_dispute_votes.into()
                    @ InputError::UserMaxDisputesReached,
    )]
    pub voter_record: Box<Account<'info, VoterRecord>>,

    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
   )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = dispute
    )]
    pub rep_vault: Account<'info, TokenAccount>,

    #[account(
        seeds = ["court".as_bytes(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    /// CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = user,
    )]
    pub user_rep_ata: Account<'info, TokenAccount>,

    #[account(
        constraint = rep_mint.key() == court.rep_mint @ AccountError::ReputationMintMismatch
    )]
    pub rep_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>
}