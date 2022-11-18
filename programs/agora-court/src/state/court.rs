use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;

#[account]
pub struct Court {
    minWindow: u32, // 4 bytes
    minArbCost: u64, // 8 bytes
    lastDID: u64 // 8 bytes
}

impl Court {
    // discriminator - 8 bytes
    pub const STATIC_SIZE: usize = 8 + 4 + 8 + 8;
    
    pub fn initialize(&mut self, _minWindow: u32, _minArbCost: u64) -> Result<()> {
        self.lastDID = 0;
        self.minWindow = _minWindow;
        self.minArbCost = _minArbCost;
        Ok(())
    }

    pub fn set_window(&mut self, _minWindow: u32) -> Result<()> {
        self.minWindow = _minWindow;
        Ok(())
    }

    pub fn set_min_cost(&mut self, _minArbCost: u64) -> Result<()> {
        self.minArbCost = _minArbCost;
        Ok(())
    }

    pub fn inc_did(&mut self) -> Result<()> {
        self.lastDID += 1;
        Ok(())
    }
}
