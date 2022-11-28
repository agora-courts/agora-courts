use anchor_lang::error_code;

#[error_code]
pub enum InputError {
    #[msg("Invalid court authority")]
    InvalidCourtAuthority,
    #[msg("Dispute does not contain payer")]
    DisputeDoesNotContainPayer,
    #[msg("User does not have a case in this dispute")]
    UserDoesNotHaveCase,
    #[msg("Dispute is not currently votable")]
    DisputeNotVotable,
    #[msg("Dispute is not finalizable")]
    DisputeNotFinalizable,
    #[msg("Cases already submitted")]
    CasesAlreadySubmitted,
}
