use crate::{error::InputError, state::dispute::*, state::court::Court};
use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, TokenAccount, transfer, Token}, associated_token::AssociatedToken};

//change initialize dispute to create the vault with the money pool (both tokens)
//based on option of pay mint or rep mint, also have Option for accounts passed in (ata)
//allow protocol to also deposit some money into either of the vaults if applicable
//set authority for the ATAs to the dispute
//option to deposit for both ATAs
//make sure ATAs are initialized here regardless

//HUGE CHANGE: THIS INSTRUCTION IS JUST THE PROTOCOL so it initializes accounts. 
//However, all involved users should interact (should be a CPI call to force staking) via the interact function.

//Changed Vec<Pubkey> users -> Vec<Option<Pubkey>> and added logic

pub fn initialize_dispute(
    ctx: Context<InitializeDispute>,
    _court_name: String,
    users: Vec<Option<Pubkey>>,
    config: DisputeConfiguration
) -> Result<()> {
    //check end times
    let timestamp = Clock::get().unwrap().unix_timestamp;
    require!(timestamp < config.grace_ends_at, InputError::InvalidEndTime);
    require!(config.grace_ends_at < config.init_cases_ends_at, InputError::InvalidEndTime);
    require!(config.init_cases_ends_at < config.voting_ends_at, InputError::InvalidEndTime);
    require!(config.voting_ends_at < config.dispute_ends_at, InputError::InvalidEndTime);
    require!(!users.is_empty(), InputError::UsersEmpty);

    let provided_rep = config.protocol_rep;
    let provided_pay = config.protocol_pay;
    let len = users.len();

    //init dispute account with initial data
    let dispute = &mut ctx.accounts.dispute;
    let bump = *ctx.bumps.get("dispute").unwrap();
    dispute.set_inner(Dispute {
        users,
        votes: vec![0; len],
        status: DisputeStatus::Grace,
        interactions: 0,
        submitted_cases: 0,
        config,
        bump,
    });
    ctx.accounts.court.num_disputes += 1;

    //transfer rep tokens from the actual protocol
    if provided_rep > 0 {
        let protocol_ata = &mut ctx.accounts.protocol_rep_ata;

        if let Some(acc) = protocol_ata {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: acc.to_account_info(),
                    to: ctx.accounts.rep_vault.to_account_info(),
                    authority: ctx.accounts.protocol.to_account_info(),
                }
            );
    
            transfer(cpi_ctx, provided_rep)?;
        } else {
            return err!(InputError::ReputationAtaMissing);
        }
    }

    //transfer pay tokens from actual protocol
    if provided_pay > 0 {
        let protocol_ata = &mut ctx.accounts.protocol_pay_ata;
        let vault_ata = &mut ctx.accounts.pay_vault;

        if let (Some(protocol_acc), Some(vault_acc), Some(mint), Some(mint_acc)) = (protocol_ata, vault_ata, &ctx.accounts.court.pay_mint, &ctx.accounts.pay_mint) {
            require!(mint_acc.key() == *mint, InputError::ProtocolMintMismatch);
            
            let cpi_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: protocol_acc.to_account_info(),
                    to: vault_acc.to_account_info(),
                    authority: ctx.accounts.protocol.to_account_info()
                }
            );

            transfer(cpi_ctx, provided_pay)?;
        } else {
            return err!(InputError::PaymentAtaMissing);
        }
    }

    Ok(())
}


#[derive(Accounts)]
#[instruction(_court_name: String, users: Vec<Option<Pubkey>>, config: DisputeConfiguration)]
pub struct InitializeDispute<'info> {
    #[account(
        init,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), court.num_disputes.to_be_bytes().as_ref()],
        bump,
        payer = payer,
        space = Dispute::get_size(&users)
    )]
    pub dispute: Box<Account<'info, Dispute>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = rep_mint,
        associated_token::authority = dispute
    )]
    pub rep_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = pay_mint,
        associated_token::authority = dispute
    )]
    pub pay_vault: Option<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = ["court".as_bytes(), _court_name.as_bytes()],
        bump = court.bump
    )]
    pub court: Box<Account<'info, Court>>,

    #[account(mut)]
    pub payer: Signer<'info>, //payer may be the same as protocol, but not when PDA

    #[account(
        mut,
        constraint = protocol.key() == court.protocol @ InputError::InvalidProtocol
    )]
    pub protocol: Signer<'info>, // protocol that makes CPI needs to sign again

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = protocol
    )]
    pub protocol_rep_ata: Option<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = protocol
    )]
    pub protocol_pay_ata: Option<Account<'info, TokenAccount>>,

    #[account(
        constraint = rep_mint.key() == court.rep_mint @ InputError::ReputationMintMismatch
    )]
    pub rep_mint: Box<Account<'info, Mint>>,

    pub pay_mint: Option<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>
} 