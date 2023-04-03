use anchor_lang::prelude::*;

use instructions::*;
use state::*;

pub mod state;
pub mod instructions;

declare_id!("Fx47ugR8zmke83hwzFHfgS5PKZN2wXeX1aP3g7DbS9r");

//This contract is part of the Agora Tokens Demo, which provides one implementation of Agora Court. 
//Note that this is the simplest way to create a functional dispute. Tokens are minted to anyone,
//and this contract simply creates disputes with some parameters. It stores some external information
//about each dispute, but it does not have any other functionality.
//Ideally, we recommend that each interact and initialize_dispute instruction is carried out through a CPI from a protocol's contract.
//Other instructions can be invoked directly through Agora Court. 

#[program]
pub mod demo_tokens {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn submit_token(
        ctx: Context<Submit>, 
        address: String,
        image: String,
        name: String,
        ticker: String,
        description: String,
        badges: Vec<String>,
    ) -> Result<()> {
       instructions::submit_token(ctx, address, image, name, ticker, description, badges)
    }

    pub fn token_vote(
        ctx: Context<TokenVote>,
        candidate: Pubkey,
        id: u64
    ) -> Result<()> {
        //vote for a token here and grant users w/o rep some
        instructions::token_vote(ctx, candidate, id)
    }

}