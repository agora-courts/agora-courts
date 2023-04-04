use crate::{error::InputError, state::{dispute::*, case::*, voter_record::*, Court}};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount, self};
use anchor_spl::associated_token::AssociatedToken;

pub fn select_vote(ctx: Context<SelectVote>, dispute_id: u64) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let voter_record = &mut ctx.accounts.voter_record;
    let user_ata = &mut ctx.accounts.user_rep_ata;
    //check timing / status
    dispute.can_vote()?;

    msg!("Dispute ID: {}", dispute_id);
    //push vote to binary heap
    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: dispute.config.ends_at,
        user_voted_for: ctx.accounts.candidate.key()
    };
    voter_record.push(dispute_record);

    //ensure user balance is good
    let true_balance = voter_record.currently_staked_rep + user_ata.amount;
    if true_balance < dispute.config.voter_rep_required {
        return err!(InputError::UserDoesNotHaveEnoughReputation);
    }

    //transfer rep cost
    let rep_cost = dispute.config.voter_rep_cost;
    if rep_cost > 0 {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: user_ata.to_account_info(),
                to: ctx.accounts.rep_vault.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            }
        );

        token::transfer(cpi_ctx, rep_cost)?;
        voter_record.currently_staked_rep += rep_cost;
    }

    //increment votes - need to ZK later
    let case = &mut ctx.accounts.case;
    case.votes += 1;
    dispute.votes += 1;
    if case.votes > dispute.leader.votes {
        dispute.leader = CaseLeader {
            user: ctx.accounts.candidate.key(),
            votes: case.votes
        }
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(dispute_id: u64)]
pub struct SelectVote<'info> {
    //a single user's case
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
        constraint = !voter_record.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,
        constraint = voter_record.claim_queue.len() < court.max_dispute_votes as usize
                    @ InputError::UserMaxDisputesReached,
        constraint = !voter_record.in_dispute(dispute_id) @ InputError::UserAlreadyProvidedCase
    )]
    pub voter_record: Account<'info, VoterRecord>,

    //checks case timing and user involvement
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

    #[account(
        constraint = rep_mint.key() == court.rep_mint @ InputError::ReputationMintMismatch
    )]
    pub rep_mint: Box<Account<'info, Mint>>,

    /// CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>, // user voting

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = payer,
    )]
    pub user_rep_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>
}